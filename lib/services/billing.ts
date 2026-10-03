import pool from "../db";
import { CardTransaction } from "../types";

export async function createTransaction(data: {
  cardId: number;
  merchantId: number;
  amount: number;
  transactionDate: string;
  transactionType: "PURCHASE" | "REFUND" | "REVERSAL";
}): Promise<CardTransaction> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the card row so two transactions cannot
    // use the same available credit at the same time.
    const cardResult = await client.query(
      `
            SELECT
                Card_ID,
                Credit_Limit,
                Status
            FROM CREDIT_CARD
            WHERE Card_ID = $1
            FOR UPDATE
            `,
      [data.cardId]
    );

    if (cardResult.rowCount === 0) {
      throw new Error("Credit card not found.");
    }

    const card = cardResult.rows[0];

    if (card.status !== "ACTIVE") {
      throw new Error(
        "Transactions are allowed only on active cards."
      );
    }

    if (data.amount <= 0) {
      throw new Error(
        "Transaction amount must be greater than 0."
      );
    }

    const transactionResult = await client.query(
      `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN Transaction_Type = 'PURCHASE'
                                THEN Amount
                            WHEN Transaction_Type IN ('REFUND', 'REVERSAL')
                                THEN -Amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS transaction_outstanding
            FROM CARD_TRANSACTION
            WHERE Card_ID = $1
            `,
      [data.cardId]
    );

    const paymentResult = await client.query(
      `
            SELECT
                COALESCE(SUM(p.Amount_Paid), 0) AS total_paid
            FROM PAYMENT p
            JOIN BILLING_STATEMENT bs
                ON p.Statement_ID = bs.Statement_ID
            WHERE bs.Card_ID = $1
                AND p.Payment_Status = 'SUCCESS'
            `,
      [data.cardId]
    );

    const transactionOutstanding =
      Number(transactionResult.rows[0].transaction_outstanding);

    const totalPayments =
      Number(paymentResult.rows[0].total_paid);

    const creditLimit =
      Number(card.credit_limit);

    const outstanding =
      transactionOutstanding - totalPayments;

    const availableCredit =
      creditLimit - outstanding;

    // A purchase must fit within the remaining credit.
    if (
      data.transactionType === "PURCHASE" &&
      data.amount > availableCredit
    ) {
      throw new Error(
        `Transaction exceeds available credit. Available credit: ${availableCredit.toFixed(2)}`
      );
    }

    const result = await client.query(
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

    await client.query("COMMIT");

    const row = result.rows[0];

    return {
      id: String(row.transaction_id),
      cardId: String(row.card_id),
      merchantId: String(row.merchant_id),
      amount: Number(row.amount),
      date: row.transaction_date,
      type: row.transaction_type,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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