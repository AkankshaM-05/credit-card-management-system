import pool from "../db";
import { BillingStatement, BillingStatus } from "../types";

/*
  Get all billing statements for a card
*/
export async function getBillingStatementsByCard(
  cardId: number
): Promise<BillingStatement[]> {
  const result = await pool.query(
    `
      SELECT
        Statement_ID,
        Card_ID,
        Billing_Start_Date,
        Billing_End_Date,
        Transaction_Amount,
        Amount_Paid,
        Due_Date,
        Status
      FROM BILLING_STATEMENT
      WHERE Card_ID = $1
      ORDER BY Billing_End_Date DESC, Statement_ID DESC
    `,
    [cardId]
  );

  return result.rows.map((row) => ({
    id: String(row.statement_id),
    cardId: String(row.card_id),
    billingStartDate: row.billing_start_date,
    billingEndDate: row.billing_end_date,
    transactionAmount: Number(row.transaction_amount),
    amountPaid: Number(row.amount_paid),
    dueDate: row.due_date,
    status: row.status as BillingStatus,
  }));
}

/*
  Get one billing statement
*/
export async function getBillingStatementById(
  statementId: number
): Promise<BillingStatement | null> {
  const result = await pool.query(
    `
      SELECT
        Statement_ID,
        Card_ID,
        Billing_Start_Date,
        Billing_End_Date,
        Transaction_Amount,
        Amount_Paid,
        Due_Date,
        Status
      FROM BILLING_STATEMENT
      WHERE Statement_ID = $1
    `,
    [statementId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: String(row.statement_id),
    cardId: String(row.card_id),
    billingStartDate: row.billing_start_date,
    billingEndDate: row.billing_end_date,
    transactionAmount: Number(row.transaction_amount),
    amountPaid: Number(row.amount_paid),
    dueDate: row.due_date,
    status: row.status as BillingStatus,
  };
}

/*
  Convert a PostgreSQL DATE string (YYYY-MM-DD)
  into a local calendar date without timezone shifting.
*/
function parseDateOnly(value: string | Date): Date {
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  );
}

/*
  Format a local calendar date as YYYY-MM-DD.

  Do NOT use toISOString() here because it converts
  the date to UTC and can shift it by one day.
*/
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  Generate weekly billing statements.

  Rules:
  - Billing starts from the card's Issue_Date.
  - Each billing period is exactly 7 days.
  - Empty periods are skipped.
  - No future billing periods are created.
  - Existing statements are not duplicated.
  - New statements start with status DUE.
  - Due date = billing period end + 15 days.
  - Unpaid/partially paid past-due statements become OVERDUE.
*/
export async function generateWeeklyBillingStatements(): Promise<{
  generated: number;
  skipped: number;
}> {
  const client = await pool.connect();

  let generated = 0;
  let skipped = 0;

  try {
    await client.query("BEGIN");

    /*
      Mark unpaid or partially paid statements as OVERDUE
      once their due date has passed.

      PAID statements are not affected.
    */
    await client.query(
      `
        UPDATE BILLING_STATEMENT
        SET Status = 'OVERDUE'
        WHERE Status IN ('DUE', 'PARTIAL')
          AND Due_Date < CURRENT_DATE
      `
    );

    const today = new Date();

    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    /*
      Get all active or blocked cards.
    */
    const cardsResult = await client.query(
      `
        SELECT
          Card_ID,
          Issue_Date
        FROM CREDIT_CARD
        WHERE Status IN ('ACTIVE', 'BLOCKED')
      `
    );

    for (const card of cardsResult.rows) {
      /*
        Parse PostgreSQL DATE without timezone conversion.
      */
      const issueDateOnly = parseDateOnly(card.issue_date);

      /*
        Ignore cards that have not been issued yet.
      */
      if (issueDateOnly > todayDate) {
        continue;
      }

      /*
        Start exactly from the card's Issue_Date.
      */
      let billingStart = new Date(issueDateOnly);

      while (true) {
        /*
          Each billing period contains 7 days:
          Start date through Start + 6 days.
        */
        const billingEnd = new Date(billingStart);

        billingEnd.setDate(billingEnd.getDate() + 6);

        /*
          Do not process a future billing period.
        */
        if (billingStart > todayDate) {
          break;
        }

        const billingStartDate = formatDate(billingStart);
        const billingEndDate = formatDate(billingEnd);

        /*
          For the current incomplete period,
          only include transactions up to today.
        */
        const transactionEndDate =
          billingEnd > todayDate
            ? formatDate(todayDate)
            : billingEndDate;

        /*
          Check whether this exact billing statement
          already exists.
        */
        const existingStatement = await client.query(
          `
            SELECT Statement_ID
            FROM BILLING_STATEMENT
            WHERE Card_ID = $1
              AND Billing_Start_Date = $2
              AND Billing_End_Date = $3
          `,
          [
            card.card_id,
            billingStartDate,
            billingEndDate,
          ]
        );

        /*
          Do not create an exact duplicate.
        */
        if (existingStatement.rows.length > 0) {
          skipped++;
        } else {
          /*
            Calculate the net transaction amount.

            PURCHASE  -> adds
            REFUND    -> subtracts
            REVERSAL  -> subtracts
          */
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
                ) AS Transaction_Amount
              FROM CARD_TRANSACTION
              WHERE Card_ID = $1
                AND Transaction_Date >= $2
                AND Transaction_Date <= $3
            `,
            [
              card.card_id,
              billingStartDate,
              transactionEndDate,
            ]
          );

          const transactionAmount = Number(
            transactionResult.rows[0].transaction_amount
          );

          /*
            Skip empty billing periods.
          */
          if (transactionAmount <= 0) {
            skipped++;
          } else {
            const amountPaid = 0;
            const status: BillingStatus = "DUE";

            /*
              Due date = billing period end + 15 days.
            */
            const dueDateObject = new Date(billingEnd);

            dueDateObject.setDate(
              dueDateObject.getDate() + 15
            );

            const dueDate = formatDate(dueDateObject);

            /*
              Create the billing statement.
            */
            await client.query(
              `
                INSERT INTO BILLING_STATEMENT
                (
                  Card_ID,
                  Billing_Start_Date,
                  Billing_End_Date,
                  Transaction_Amount,
                  Amount_Paid,
                  Due_Date,
                  Status
                )
                VALUES
                ($1, $2, $3, $4, $5, $6, $7)
              `,
              [
                card.card_id,
                billingStartDate,
                billingEndDate,
                transactionAmount,
                amountPaid,
                dueDate,
                status,
              ]
            );

            generated++;
          }
        }

        /*
          Stop after processing the current period.
        */
        if (billingEnd >= todayDate) {
          break;
        }

        /*
          Move exactly 7 days forward.
        */
        billingStart = new Date(billingEnd);

        billingStart.setDate(
          billingStart.getDate() + 1
        );
      }
    }

    await client.query("COMMIT");

    return {
      generated,
      skipped,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}