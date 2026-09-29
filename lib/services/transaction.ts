import pool from "../db";
import { CardTransaction } from "../types";

export async function createTransaction(data: {
    cardId: number;
    merchantId: number;
    amount: number;
    transactionDate: string;
    transactionType: "PURCHASE" | "REFUND" | "REVERSAL";
}): Promise<CardTransaction> {
    const result = await pool.query(
        `
    INSERT INTO CARD_TRANSACTION
      (
        Card_ID,
        Merchant_ID,
        Amount,
        Transaction_Date,
        Transaction_Type
      )
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING
      Transaction_ID,
      Card_ID,
      Merchant_ID,
      Amount,
      Transaction_Date,
      Transaction_Type
    `,
        [
            data.cardId,
            data.merchantId,
            data.amount,
            data.transactionDate,
            data.transactionType,
        ]
    );

    const row = result.rows[0];

    return {
        id: String(row.transaction_id),
        cardId: String(row.card_id),
        merchantId: String(row.merchant_id),
        amount: Number(row.amount),
        date: row.transaction_date,
        type: row.transaction_type,
    };
}

export async function getTransactionsByCard(
    cardId: number
): Promise<CardTransaction[]> {
    const result = await pool.query(
        `
    SELECT
      ct.Transaction_ID,
      ct.Card_ID,
      ct.Merchant_ID,
      m.Merchant_Name,
      ct.Amount,
      ct.Transaction_Date,
      ct.Transaction_Type
    FROM CARD_TRANSACTION ct
    JOIN MERCHANT m
      ON ct.Merchant_ID = m.Merchant_ID
    WHERE ct.Card_ID = $1
    ORDER BY ct.Transaction_Date DESC, ct.Transaction_ID DESC
    `,
        [cardId]
    );

    return result.rows.map((row) => ({
        id: String(row.transaction_id),
        cardId: String(row.card_id),
        merchantId: String(row.merchant_id),
        merchantName: row.merchant_name,
        amount: Number(row.amount),
        date: row.transaction_date,
        type: row.transaction_type,
    }));
}