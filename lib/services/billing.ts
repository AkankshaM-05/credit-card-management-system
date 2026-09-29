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
  Generate 5-day billing statements.

  The current 5-day billing period is also created
  immediately. It does not wait for all 5 days to finish.

  Example:

  Card issued on 20 September

  20 Sep - 24 Sep → Statement 1
  25 Sep - 29 Sep → Statement 2
  30 Sep - 04 Oct → Statement 3
*/
export async function generateMonthlyBillingStatements(): Promise<{
  generated: number;
  skipped: number;
}> {
  const client = await pool.connect();

  let generated = 0;
  let skipped = 0;

  try {
    await client.query("BEGIN");

    const today = new Date();

    /*
      Remove time from today's date.
    */
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    /*
      Format Date as YYYY-MM-DD.
    */
    const formatDate = (date: Date) => {
      return date.toISOString().split("T")[0];
    };

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
      const issueDate = new Date(card.issue_date);

      const issueDateOnly = new Date(
        issueDate.getFullYear(),
        issueDate.getMonth(),
        issueDate.getDate()
      );

      /*
        Ignore cards that have not been issued yet.
      */
      if (issueDateOnly > todayDate) {
        continue;
      }

      /*
        Start from the card's issue date.
      */
      let billingStart = new Date(
        issueDateOnly
      );

      /*
        Find the current 5-day billing period.

        Each period contains 5 days:
        Start → Start + 4 days
      */
      while (true) {
        const billingEnd = new Date(
          billingStart
        );

        billingEnd.setDate(
          billingEnd.getDate() + 4
        );

        /*
          If today's date is before this period,
          stop.
        */
        if (billingStart > todayDate) {
          break;
        }

        /*
          The statement can cover the full
          5-day period even if it is still ongoing.
        */
        const billingStartDate =
          formatDate(billingStart);

        const billingEndDate =
          formatDate(billingEnd);

        /*
          Only include transactions that have
          happened so far.

          For a completed period, this includes
          the entire period.

          For the current period, this includes
          transactions up to today.
        */
        const transactionEndDate =
          billingEnd > todayDate
            ? formatDate(todayDate)
            : billingEndDate;

        /*
          Due date is 15 days after the
          billing period ends.
        */
        const dueDateObject = new Date(
          billingEnd
        );

        dueDateObject.setDate(
          dueDateObject.getDate() + 15
        );

        const dueDate =
          formatDate(dueDateObject);

        /*
          Check whether this statement already exists.
        */
        const existingStatement =
          await client.query(
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

        if (existingStatement.rows.length === 0) {
          /*
            Calculate transaction amount.

            PURCHASE  → adds
            REFUND    → subtracts
            REVERSAL  → subtracts
          */
          const transactionResult =
            await client.query(
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

          const transactionAmount =
            Number(
              transactionResult.rows[0]
                .transaction_amount
            );

          /*
            New statement starts with
            no payment.
          */
          const amountPaid = 0;

          const amountToBePaid =
            transactionAmount - amountPaid;

          /*
            If there is an amount to pay,
            status is DUE.

            If there is nothing to pay,
            status is PAID.
          */
          const status: BillingStatus =
            amountToBePaid <= 0
              ? "PAID"
              : "DUE";

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
        } else {
          skipped++;
        }

        /*
          If this is the current billing period,
          there is no need to create future periods.
        */
        if (billingEnd >= todayDate) {
          break;
        }

        /*
          Move to the next 5-day period.
        */
        billingStart = new Date(
          billingEnd
        );

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