import pool from "../db";
import { Payment, BillingStatus } from "../types";

export async function createPayment(data: {
    statementId: number;
    amountPaid: number;
    paymentDate: string;
}): Promise<Payment> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const statementResult = await client.query(
            `
            SELECT
                Statement_ID,
                Card_ID,
                Transaction_Amount,
                Amount_Paid
            FROM BILLING_STATEMENT
            WHERE Statement_ID = $1
            FOR UPDATE
            `,
            [data.statementId]
        );

        if (statementResult.rowCount === 0) {
            throw new Error("Billing statement not found.");
        }

        const statement = statementResult.rows[0];

        /*
          Payment amount must be greater than zero.
        */
        if (data.amountPaid <= 0) {
            throw new Error(
                "Payment amount must be greater than 0."
            );
        }

        /*
          Calculate the current outstanding amount.
        */
        const transactionAmount =
            Number(statement.transaction_amount);

        const currentAmountPaid =
            Number(statement.amount_paid);

        const outstandingAmount =
            transactionAmount - currentAmountPaid;

        /*
          Payment cannot be greater than
          the outstanding amount.
        */
        if (data.amountPaid > outstandingAmount) {
            throw new Error(
                "Payment amount exceeds the outstanding amount."
            );
        }

        /*
          Since this is manual payment recording,
          a valid recorded payment is automatically
          treated as SUCCESS.
        */
        const paymentResult = await client.query(
            `
            INSERT INTO PAYMENT
            (
                Statement_ID,
                Amount_Paid,
                Payment_Date,
                Payment_Status
            )
            VALUES
            ($1, $2, $3, 'SUCCESS')
            RETURNING
                Payment_ID,
                Statement_ID,
                Amount_Paid,
                Payment_Date,
                Payment_Status
            `,
            [
                data.statementId,
                data.amountPaid,
                data.paymentDate,
            ]
        );

        /*
          Update total amount paid on the statement.
        */
        const newAmountPaid =
            currentAmountPaid + data.amountPaid;

        /*
          Determine the new billing status.
        */
        const dueDate = new Date(statement.due_date);
        const today = new Date();

        let newStatus: BillingStatus;

        if (newAmountPaid === transactionAmount) {
            newStatus = "PAID";
        } else if (today > dueDate) {
            newStatus = "OVERDUE";
        } else if (newAmountPaid > 0) {
            newStatus = "PARTIAL";
        } else {
            newStatus = "DUE";
        }

        /*
          Update billing statement.
        */
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
                data.statementId,
            ]
        );

        await client.query("COMMIT");

        const row = paymentResult.rows[0];

        return {
            id: String(row.payment_id),
            statementId: String(row.statement_id),
            amountPaid: Number(row.amount_paid),
            paymentDate: row.payment_date,
            paymentStatus: row.payment_status,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getPaymentsByCard(
    cardId: number
): Promise<Payment[]> {
    const result = await pool.query(
        `
        SELECT
            p.Payment_ID,
            p.Statement_ID,
            p.Amount_Paid,
            p.Payment_Date,
            p.Payment_Status
        FROM PAYMENT p
        JOIN BILLING_STATEMENT bs
            ON p.Statement_ID = bs.Statement_ID
        WHERE bs.Card_ID = $1
        ORDER BY p.Payment_Date DESC, p.Payment_ID DESC
        `,
        [cardId]
    );

    return result.rows.map((row) => ({
        id: String(row.payment_id),
        statementId: String(row.statement_id),
        amountPaid: Number(row.amount_paid),
        paymentDate: row.payment_date,
        paymentStatus: row.payment_status,
    }));
}