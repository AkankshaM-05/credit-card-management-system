import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";

type ExcelTransaction = {
    Card_ID: unknown;
    Merchant_ID: unknown;
    Amount: unknown;
    Transaction_Date: unknown;
    Transaction_Type: unknown;
};

export async function POST(request: Request) {
    const client = await pool.connect();

    try {
        // Authentication
        const user = await getSession();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Authorization
        if (user.userType !== "EMPLOYEE") {
            return NextResponse.json(
                { error: "Only employees can import transactions." },
                { status: 403 }
            );
        }

        // Get uploaded file
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Excel file is required." },
                { status: 400 }
            );
        }

        // Read Excel file
        const buffer = Buffer.from(await file.arrayBuffer());

        const workbook = XLSX.read(buffer, {
            type: "buffer",
            cellDates: true,
        });

        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            return NextResponse.json(
                { error: "Excel file contains no worksheet." },
                { status: 400 }
            );
        }

        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json<ExcelTransaction>(
            worksheet,
            {
                defval: null,
            }
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: "Excel file contains no transaction records." },
                { status: 400 }
            );
        }

        const validTransactions: {
            cardId: number;
            merchantId: number;
            amount: number;
            transactionDate: string;
            transactionType: "PURCHASE" | "REFUND" | "REVERSAL";
        }[] = [];

        const errors: {
            row: number;
            error: string;
        }[] = [];

        // Validate Excel rows
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const excelRowNumber = i + 2;

            const cardId = Number(row.Card_ID);
            const merchantId = Number(row.Merchant_ID);
            const amount = Number(row.Amount);

            const transactionDate = normalizeDate(
                row.Transaction_Date
            );

            const transactionType = String(
                row.Transaction_Type ?? ""
            )
                .trim()
                .toUpperCase();

            if (!Number.isInteger(cardId) || cardId <= 0) {
                errors.push({
                    row: excelRowNumber,
                    error: "Invalid Card_ID.",
                });
                continue;
            }

            if (!Number.isInteger(merchantId) || merchantId <= 0) {
                errors.push({
                    row: excelRowNumber,
                    error: "Invalid Merchant_ID.",
                });
                continue;
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                errors.push({
                    row: excelRowNumber,
                    error: "Amount must be greater than 0.",
                });
                continue;
            }

            if (!transactionDate) {
                errors.push({
                    row: excelRowNumber,
                    error: "Invalid Transaction_Date.",
                });
                continue;
            }

            if (
                transactionType !== "PURCHASE" &&
                transactionType !== "REFUND" &&
                transactionType !== "REVERSAL"
            ) {
                errors.push({
                    row: excelRowNumber,
                    error:
                        "Transaction_Type must be PURCHASE, REFUND, or REVERSAL.",
                });
                continue;
            }

            validTransactions.push({
                cardId,
                merchantId,
                amount,
                transactionDate,
                transactionType,
            });
        }

        // Do not insert anything if any Excel row is invalid
        if (errors.length > 0) {
            return NextResponse.json(
                {
                    message:
                        "Import failed. No transactions were inserted.",
                    totalRows: rows.length,
                    successfulRows: 0,
                    failedRows: errors.length,
                    errors,
                },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        // Insert transactions
        for (const transaction of validTransactions) {
            // Check Card_ID and Card Status
            const cardResult = await client.query(
                `
                SELECT Card_ID, Status
                FROM CREDIT_CARD
                WHERE Card_ID = $1
                `,
                [transaction.cardId]
            );

            if (cardResult.rowCount === 0) {
                throw new Error(
                    `Card_ID ${transaction.cardId} does not exist.`
                );
            }

            if (cardResult.rows[0].status !== "ACTIVE") {
                throw new Error(
                    `Transaction cannot be created for Card_ID ${transaction.cardId}. Card status is ${cardResult.rows[0].status}.`
                );
            }

            // Check Merchant_ID
            const merchantResult = await client.query(
                `
                SELECT Merchant_ID
                FROM MERCHANT
                WHERE Merchant_ID = $1
                `,
                [transaction.merchantId]
            );

            if (merchantResult.rowCount === 0) {
                throw new Error(
                    `Merchant_ID ${transaction.merchantId} does not exist.`
                );
            }

            await client.query(
                `
                INSERT INTO CARD_TRANSACTION
                (
                    Card_ID,
                    Merchant_ID,
                    Amount,
                    Transaction_Date,
                    Transaction_Type
                )
                VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    transaction.cardId,
                    transaction.merchantId,
                    transaction.amount,
                    transaction.transactionDate,
                    transaction.transactionType,
                ]
            );
        }

        await client.query("COMMIT");

        return NextResponse.json(
            {
                message: "Transactions imported successfully.",
                totalRows: rows.length,
                successfulRows: validTransactions.length,
                failedRows: 0,
            },
            { status: 201 }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Transaction import failed:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import transactions.",
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

function normalizeDate(value: unknown): string | null {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString().split("T")[0];
    }

    if (typeof value === "number") {
        const date = XLSX.SSF.parse_date_code(value);

        if (!date) {
            return null;
        }

        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
            date.d
        ).padStart(2, "0")}`;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        const parsed = new Date(trimmed);

        if (isNaN(parsed.getTime())) {
            return null;
        }

        return parsed.toISOString().split("T")[0];
    }

    return null;
}