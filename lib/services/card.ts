import pool from "../db";
import { CreditCard, CardStatus } from "../types";
import { createAuditLog } from "./audit";

export async function createCard(data: {
    customerId: string;
    creditLimit: number;
    issueDate: string;
    expiryDate: string;
}): Promise<CreditCard> {
    const result = await pool.query(
        `
    INSERT INTO CREDIT_CARD
      (
        Customer_ID,
        Credit_Limit,
        Issue_Date,
        Expiry_Date,
        Status
      )
    VALUES
      ($1, $2, $3, $4, 'PENDING_APPROVAL')
    RETURNING
      Card_ID,
      Customer_ID,
      Credit_Limit,
      Issue_Date,
      Expiry_Date,
      Status
    `,
        [
            data.customerId,
            data.creditLimit,
            data.issueDate,
            data.expiryDate,
        ]
    );

    const row = result.rows[0];

    return {
        id: String(row.card_id),
        customerId: String(row.customer_id),
        creditLimit: Number(row.credit_limit),
        issueDate: row.issue_date,
        expiryDate: row.expiry_date,
        status: row.status,
    };
}

export async function getCardsByCustomer(
    customerId: string
): Promise<CreditCard[]> {
    const result = await pool.query(
        `
    SELECT
      cc.Card_ID,
      cc.Customer_ID,
      c.Name AS Customer_Name,
      cc.Credit_Limit,
      cc.Issue_Date,
      cc.Expiry_Date,
      cc.Status
    FROM CREDIT_CARD cc
    JOIN CUSTOMER c
      ON cc.Customer_ID = c.Customer_ID
    WHERE cc.Customer_ID = $1
    ORDER BY cc.Card_ID
    `,
        [customerId]
    );

    return result.rows.map((row) => ({
        id: String(row.card_id),
        customerId: String(row.customer_id),
        customerName: row.customer_name,
        creditLimit: Number(row.credit_limit),
        issueDate: row.issue_date,
        expiryDate: row.expiry_date,
        status: row.status,
    }));
}

export async function getCardById(
    cardId: number
): Promise<CreditCard | null> {
    const result = await pool.query(
        `
    SELECT
      cc.Card_ID,
      cc.Customer_ID,
      c.Name AS Customer_Name,
      cc.Credit_Limit,
      cc.Issue_Date,
      cc.Expiry_Date,
      cc.Status
    FROM CREDIT_CARD cc
    JOIN CUSTOMER c
      ON cc.Customer_ID = c.Customer_ID
    WHERE cc.Card_ID = $1
    `,
        [cardId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    return {
        id: String(row.card_id),
        customerId: String(row.customer_id),
        customerName: row.customer_name,
        creditLimit: Number(row.credit_limit),
        issueDate: row.issue_date,
        expiryDate: row.expiry_date,
        status: row.status,
    };
}

export async function updateCardStatus(
    cardId: number,
    newStatus: CardStatus,
    staffId: string,
    reason?: string
): Promise<CreditCard | null> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const currentResult = await client.query(
            `
      SELECT Status
      FROM CREDIT_CARD
      WHERE Card_ID = $1
      `,
            [cardId]
        );

        if (currentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const currentStatus = currentResult.rows[0].status;

        const validTransition =
            (currentStatus === "PENDING_APPROVAL" &&
                newStatus === "ACTIVE") ||
            (currentStatus === "ACTIVE" &&
                newStatus === "BLOCKED") ||
            (currentStatus === "BLOCKED" &&
                newStatus === "CLOSED");

        if (!validTransition) {
            throw new Error(
                `Invalid card status transition: ${currentStatus} → ${newStatus}`
            );
        }

        const result = await client.query(
            `
      UPDATE CREDIT_CARD
      SET Status = $1
      WHERE Card_ID = $2
      RETURNING
        Card_ID,
        Customer_ID,
        Credit_Limit,
        Issue_Date,
        Expiry_Date,
        Status
      `,
            [newStatus, cardId]
        );

        await createAuditLog(
            client,
            staffId,
            cardId,
            newStatus,
            reason
        );

        await client.query("COMMIT");

        const row = result.rows[0];

        return {
            id: String(row.card_id),
            customerId: String(row.customer_id),
            creditLimit: Number(row.credit_limit),
            issueDate: row.issue_date,
            expiryDate: row.expiry_date,
            status: row.status,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}