import nodemailer from "nodemailer";
import pool from "../db";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function sendEmail(data: {
    to: string;
    subject: string;
    html: string;
}) {
    const result = await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.to,
        subject: data.subject,
        html: data.html,
    });

    return result;
}

export async function sendBillingDueReminders(
    targetDate?: string
) {
    const result = await pool.query(
        `
        SELECT
            c.Name AS customer_name,
            c.Email AS customer_email,

            cc.Card_ID,
            cc.Credit_Limit,

            bs.Statement_ID,
            bs.Billing_Start_Date,
            bs.Billing_End_Date,
            bs.Transaction_Amount,
            bs.Amount_Paid,
            bs.Due_Date,
            bs.Status,

            (bs.Transaction_Amount - bs.Amount_Paid)
                AS remaining_amount

        FROM BILLING_STATEMENT bs

        JOIN CREDIT_CARD cc
            ON bs.Card_ID = cc.Card_ID

        JOIN CUSTOMER c
            ON cc.Customer_ID = c.Customer_ID

        WHERE
            bs.Status IN ('DUE', 'PARTIAL')
            AND (
                bs.Due_Date = COALESCE(
                    $1::date,
                    CURRENT_DATE + 1
                )
                OR
                bs.Due_Date = COALESCE(
                    $1::date,
                    CURRENT_DATE
                ) - INTERVAL '1 day'
            )
        `,
        [targetDate ?? null]
    );

    let sent = 0;

    for (const statement of result.rows) {
        const remainingAmount =
            Number(statement.remaining_amount);

        const creditLimit =
            Number(statement.credit_limit);

        const outstandingResult = await pool.query(
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
            [statement.card_id]
        );

        const paymentResult = await pool.query(
            `
            SELECT
                COALESCE(SUM(p.Amount_Paid), 0) AS total_paid
            FROM PAYMENT p
            JOIN BILLING_STATEMENT bs
                ON p.Statement_ID = bs.Statement_ID
            WHERE bs.Card_ID = $1
              AND p.Payment_Status = 'SUCCESS'
            `,
            [statement.card_id]
        );

        const transactionOutstanding =
            Number(
                outstandingResult.rows[0]
                    .transaction_outstanding
            );

        const totalPayments =
            Number(
                paymentResult.rows[0]
                    .total_paid
            );

        const currentOutstanding =
            transactionOutstanding - totalPayments;

        const availableCredit =
            creditLimit - currentOutstanding;

        const testDate =
            targetDate
                ? new Date(`${targetDate}T00:00:00`)
                : new Date();

        const dueDate =
            new Date(statement.due_date);

        const isOverdue =
            dueDate < testDate;

        const subject = isOverdue
            ? `Payment Overdue - Credit Card Statement #${statement.statement_id}`
            : `Payment Reminder - Credit Card Statement #${statement.statement_id}`;

        const emailMessage = isOverdue
            ? `
                <p>
                    Your credit card payment was due on
                    <strong>${statement.due_date}</strong>
                    and has not been fully received.
                </p>

                <p>
                    Please make the remaining payment as soon as possible
                    to clear the outstanding statement balance.
                </p>

                <p>
                    <strong>
                        Additional charges may apply according to
                        the applicable payment terms.
                    </strong>
                </p>
            `
            : `
                <p>
                    This is a reminder that your credit card
                    payment is due <strong>tomorrow</strong>.
                </p>

                <p>
                    Please ensure that the remaining statement
                    balance is paid by the due date.
                </p>
            `;

        await sendEmail({
            to: statement.customer_email,

            subject,

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 650px;
                    margin: auto;
                    padding: 24px;
                    color: #1f2937;
                    line-height: 1.6;
                ">

                    <h2 style="margin-bottom: 4px;">
                        ${isOverdue
                    ? "Credit Card Payment Overdue"
                    : "Credit Card Payment Reminder"
                }
                    </h2>

                    <p>
                        Hello ${statement.customer_name},
                    </p>

                    ${emailMessage}

                    <hr />

                    <h3>Billing Statement</h3>

                    <p>
                        <strong>Statement ID:</strong>
                        ${statement.statement_id}
                    </p>

                    <p>
                        <strong>Billing Period:</strong>
                        ${statement.billing_start_date}
                        to
                        ${statement.billing_end_date}
                    </p>

                    <p>
                        <strong>Due Date:</strong>
                        ${statement.due_date}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${statement.status}
                    </p>

                    <hr />

                    <h3>Statement Summary</h3>

                    <p>
                        <strong>Statement Amount:</strong>
                        $${Number(
                    statement.transaction_amount
                ).toFixed(2)}
                    </p>

                    <p>
                        <strong>Amount Paid:</strong>
                        $${Number(
                    statement.amount_paid
                ).toFixed(2)}
                    </p>

                    <p>
                        <strong>Remaining Statement Balance:</strong>
                        $${remainingAmount.toFixed(2)}
                    </p>

                    <hr />

                    <h3>Current Credit Card Position</h3>

                    <p>
                        <strong>Credit Limit:</strong>
                        $${creditLimit.toFixed(2)}
                    </p>

                    <p>
                        <strong>Current Outstanding:</strong>
                        $${currentOutstanding.toFixed(2)}
                    </p>

                    <p>
                        <strong>Available Credit:</strong>
                        $${availableCredit.toFixed(2)}
                    </p>

                    <hr />

                    <p>
                        If you have already made a payment,
                        please allow some time for the payment
                        to be recorded in the system.
                    </p>

                    <p style="margin-top: 24px;">
                        Regards,<br />
                        Credit Card Management System
                    </p>

                </div>
            `,
        });

        sent++;
    }

    return {
        found: result.rows.length,
        sent,
    };
}