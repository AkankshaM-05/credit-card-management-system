import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";

type ExcelPayment = {
    Statement_ID: unknown;
    Amount_Paid: unknown;
    Payment_Date: unknown;
};

export async function POST(request: Request) {
    const client = await pool.connect();

    try {
        const user = await getSession();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (
            user.userType !== "EMPLOYEE" &&
            user.userType !== "MANAGER"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Only employees and managers can import payments.",
                },
                { status: 403 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Excel file is required." },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const workbook = XLSX.read(buffer, {
            type: "buffer",
            cellDates: false,
        });

        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            return NextResponse.json(
                {
                    error:
                        "Excel file contains no worksheet.",
                },
                { status: 400 }
            );
        }

        const worksheet = workbook.Sheets[sheetName];

        const rows =
            XLSX.utils.sheet_to_json<ExcelPayment>(
                worksheet,
                { defval: null }
            );

        if (rows.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Excel file contains no payment records.",
                },
                { status: 400 }
            );
        }

        const validPayments: {
            statementId: number;
            amountPaid: number;
            paymentDate: string;
        }[] = [];

        const errors: {
            row: number;
            error: string;
        }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const excelRowNumber = i + 2;

            const statementId =
                Number(row.Statement_ID);

            const amountPaid =
                Number(row.Amount_Paid);

            const paymentDate =
                normalizeDate(row.Payment_Date);

            if (
                !Number.isInteger(statementId) ||
                statementId <= 0
            ) {
                errors.push({
                    row: excelRowNumber,
                    error:
                        "Invalid Statement_ID.",
                });

                continue;
            }

            if (
                !Number.isFinite(amountPaid) ||
                amountPaid <= 0
            ) {
                errors.push({
                    row: excelRowNumber,
                    error:
                        "Amount_Paid must be greater than 0.",
                });

                continue;
            }

            if (!paymentDate) {
                errors.push({
                    row: excelRowNumber,
                    error:
                        "Invalid Payment_Date.",
                });

                continue;
            }

            validPayments.push({
                statementId,
                amountPaid,
                paymentDate,
            });
        }

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    message:
                        "Import failed. No payments were inserted.",
                    totalRows: rows.length,
                    successfulRows: 0,
                    failedRows: errors.length,
                    errors,
                },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        for (const payment of validPayments) {
            const statementResult =
                await client.query(
                    `
SELECT
Statement_ID,
    Transaction_Amount,
    Amount_Paid,
    Due_Date
                    FROM BILLING_STATEMENT
                    WHERE Statement_ID = $1
                    FOR UPDATE
                    `,
                    [payment.statementId]
                );

            if (statementResult.rowCount === 0) {
                throw new Error(
                    `Statement_ID ${payment.statementId} does not exist.`
                );
            }

            const statement =
                statementResult.rows[0];

            const transactionAmount =
                Number(
                    statement.transaction_amount
                );

            const currentAmountPaid =
                Number(
                    statement.amount_paid
                );

            const outstandingAmount =
                transactionAmount -
                currentAmountPaid;

            if (
                payment.amountPaid >
                outstandingAmount
            ) {
                throw new Error(
                    `Payment for Statement_ID ${payment.statementId} exceeds the outstanding statement amount.`
                );
            }

            await client.query(
                `
                INSERT INTO PAYMENT
    (
        Statement_ID,
        Amount_Paid,
        Payment_Date,
        Payment_Status
    )
VALUES($1, $2, $3, 'SUCCESS')
    `,
                [
                    payment.statementId,
                    payment.amountPaid,
                    payment.paymentDate,
                ]
            );

            const newAmountPaid =
                currentAmountPaid +
                payment.amountPaid;

            let newStatus:
                | "DUE"
                | "PARTIAL"
                | "PAID"
                | "OVERDUE";

            const today = new Date();
            const dueDate = new Date(statement.due_date);

            if (newAmountPaid === transactionAmount) {
                newStatus = "PAID";
            } else if (today > dueDate) {
                newStatus = "OVERDUE";
            } else if (newAmountPaid > 0) {
                newStatus = "PARTIAL";
            } else {
                newStatus = "DUE";
            }

            await client.query(
                `
                UPDATE BILLING_STATEMENT
SET
Amount_Paid = $1,
    Status = $2
                WHERE Statement_ID = $3
    `,
                [
                    newAmountPaid,
                    newStatus,
                    payment.statementId,
                ]
            );
        }

        await client.query("COMMIT");

        return NextResponse.json(
            {
                message:
                    "Payments imported successfully.",
                totalRows: rows.length,
                successfulRows:
                    validPayments.length,
                failedRows: 0,
            },
            { status: 201 }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Payment import failed:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import payments.",
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

function normalizeDate(value: unknown): string | null {
    if (typeof value === "number") {
        const date = XLSX.SSF.parse_date_code(value);

        if (!date) {
            return null;
        }

        return `${date.y} -${String(date.m).padStart(2, "0")} -${String(
            date.d
        ).padStart(2, "0")
            } `;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        const match = trimmed.match(
            /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/
        );

        if (!match) {
            return null;
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);

        const testDate = new Date(
            year,
            month - 1,
            day
        );

        if (
            testDate.getFullYear() !== year ||
            testDate.getMonth() !== month - 1 ||
            testDate.getDate() !== day
        ) {
            return null;
        }

        return `${year} -${String(month).padStart(2, "0")} -${String(
            day
        ).padStart(2, "0")
            } `;
    }

    return null;
}