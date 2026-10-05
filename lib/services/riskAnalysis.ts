import pool from "../db";

export type RiskAnalysis = {
    customerId: string;
    customerName: string;
    cardId: string;
    creditLimit: number;
    outstandingAmount: number;
    creditUtilization: number;
    paymentRatio: number;
    overdueRate: number;
    partialPaymentRate: number;
    riskStatus: "HIGH" | "MEDIUM" | "LOW";
};

export async function getRiskAnalysis(): Promise<RiskAnalysis[]> {
    const result = await pool.query(
        `
        WITH transaction_totals AS(
    SELECT
                Card_ID,
    COALESCE(
        SUM(
            CASE
                            WHEN Transaction_Type = 'PURCHASE'
                                THEN Amount
                            WHEN Transaction_Type IN('REFUND', 'REVERSAL')
                                THEN - Amount
                            ELSE 0
                        END
        ),
        0
    ) AS total_transaction_amount
            FROM CARD_TRANSACTION
            GROUP BY Card_ID
),

    payment_totals AS(
        SELECT
                bs.Card_ID,
        COALESCE(
            SUM(
                CASE
                            WHEN p.Payment_Status = 'SUCCESS'
                                THEN p.Amount_Paid
                            ELSE 0
                        END
            ),
            0
        ) AS total_amount_paid
            FROM PAYMENT p
            JOIN BILLING_STATEMENT bs
                ON p.Statement_ID = bs.Statement_ID
            GROUP BY bs.Card_ID
    ),

        statement_totals AS(
            SELECT
                Card_ID,
            COUNT(*) AS total_statements,

            COUNT(*) FILTER(
                WHERE Status = 'OVERDUE'
            ) AS overdue_statements,

            COUNT(*) FILTER(
                WHERE Status = 'PARTIAL'
            ) AS partial_statements

            FROM BILLING_STATEMENT
            GROUP BY Card_ID
        )

SELECT
cc.Card_ID,
    cc.Customer_ID,
    c.Name AS Customer_Name,
        cc.Credit_Limit,

        COALESCE(
            tt.total_transaction_amount,
            0
        ) AS total_transaction_amount,

            COALESCE(
                pt.total_amount_paid,
                0
            ) AS total_amount_paid,

                COALESCE(
                    st.total_statements,
                    0
                ) AS total_statements,

                    COALESCE(
                        st.overdue_statements,
                        0
                    ) AS overdue_statements,

                        COALESCE(
                            st.partial_statements,
                            0
                        ) AS partial_statements

        FROM CREDIT_CARD cc

        JOIN CUSTOMER c
            ON cc.Customer_ID = c.Customer_ID

        LEFT JOIN transaction_totals tt
            ON cc.Card_ID = tt.Card_ID

        LEFT JOIN payment_totals pt
            ON cc.Card_ID = pt.Card_ID

        LEFT JOIN statement_totals st
            ON cc.Card_ID = st.Card_ID

        WHERE cc.Status IN('ACTIVE', 'BLOCKED')

        ORDER BY cc.Card_ID
    `
    );

    const analysis: RiskAnalysis[] = result.rows.map((row) => {
        const creditLimit = Number(row.credit_limit);

        const totalTransactionAmount =
            Number(row.total_transaction_amount);

        const totalAmountPaid =
            Number(row.total_amount_paid);

        const outstandingAmount =
            Math.max(
                0,
                totalTransactionAmount - totalAmountPaid
            );

        const creditUtilization =
            creditLimit > 0
                ? (outstandingAmount / creditLimit) * 100
                : 0;

        const paymentRatio =
            totalTransactionAmount > 0
                ? (totalAmountPaid / totalTransactionAmount) * 100
                : 0;

        const totalStatements =
            Number(row.total_statements);

        const overdueStatements =
            Number(row.overdue_statements);

        const partialStatements =
            Number(row.partial_statements);

        const overdueRate =
            totalStatements > 0
                ? (overdueStatements / totalStatements) * 100
                : 0;

        const partialPaymentRate =
            totalStatements > 0
                ? (partialStatements / totalStatements) * 100
                : 0;

        let riskStatus: "HIGH" | "MEDIUM" | "LOW";

        const hasOutstandingBalance =
            outstandingAmount > 0;

        const noPaymentMade =
            totalAmountPaid === 0 &&
            totalTransactionAmount > 0;

        const highUtilization =
            creditUtilization > 70;

        const highOverdueRate =
            overdueRate > 20;

        const highPartialPaymentRate =
            partialPaymentRate > 30;

        if (
            noPaymentMade && hasOutstandingBalance
        ) {
            riskStatus = "HIGH";
        } else if (
            highUtilization &&
            (highOverdueRate || highPartialPaymentRate)
        ) {
            riskStatus = "HIGH";
        } else if (
            highOverdueRate ||
            highPartialPaymentRate ||
            paymentRatio < 70
        ) {
            riskStatus = "MEDIUM";
        } else {
            riskStatus = "LOW";
        }

        return {
            customerId: String(row.customer_id),
            customerName: row.customer_name,
            cardId: String(row.card_id),
            creditLimit,
            outstandingAmount,
            creditUtilization,
            paymentRatio,
            overdueRate,
            partialPaymentRate,
            riskStatus,
        };
    });

    const riskOrder = {
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
    };

    analysis.sort((a, b) => {
        const riskDifference =
            riskOrder[a.riskStatus] -
            riskOrder[b.riskStatus];

        if (riskDifference !== 0) {
            return riskDifference;
        }

        return b.creditUtilization - a.creditUtilization;
    });

    return analysis;
}