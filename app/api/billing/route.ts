import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
    getBillingStatementsByCard,
    getBillingStatementById,
    generateMonthlyBillingStatements,
} from "@/lib/services/billing";
import { getCardById } from "@/lib/services/card";

/*
  GET
  View billing statements
*/
export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    /*
      Manager, Customer and Employee can access
      billing data.

      Employee needs the statement information
      required to record payments.
    */
    if (
        session.userType !== "MANAGER" &&
        session.userType !== "CUSTOMER" &&
        session.userType !== "EMPLOYEE"
    ) {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);

        const cardId = searchParams.get("cardId");
        const statementId = searchParams.get("statementId");

        /*
          Get one billing statement
        */
        if (statementId) {
            const parsedStatementId = Number(statementId);

            if (
                !Number.isInteger(parsedStatementId) ||
                parsedStatementId <= 0
            ) {
                return NextResponse.json(
                    { error: "Invalid statement ID." },
                    { status: 400 }
                );
            }

            const statement =
                await getBillingStatementById(
                    parsedStatementId
                );

            if (!statement) {
                return NextResponse.json(
                    { error: "Billing statement not found." },
                    { status: 404 }
                );
            }

            /*
              Customer can only view their own statement.
            */
            if (session.userType === "CUSTOMER") {
                const card = await getCardById(
                    Number(statement.cardId)
                );

                if (
                    !card ||
                    card.customerId !== String(session.customerId)
                ) {
                    return NextResponse.json(
                        { error: "Forbidden" },
                        { status: 403 }
                    );
                }
            }

            return NextResponse.json(statement);
        }

        /*
          Get all statements for a card
        */
        if (!cardId) {
            return NextResponse.json(
                { error: "Card ID is required." },
                { status: 400 }
            );
        }

        const parsedCardId = Number(cardId);

        if (
            !Number.isInteger(parsedCardId) ||
            parsedCardId <= 0
        ) {
            return NextResponse.json(
                { error: "Invalid card ID." },
                { status: 400 }
            );
        }

        const card = await getCardById(parsedCardId);

        if (!card) {
            return NextResponse.json(
                { error: "Card not found." },
                { status: 404 }
            );
        }

        /*
          Customer can only view billing
          for their own card.
        */
        if (
            session.userType === "CUSTOMER" &&
            card.customerId !== String(session.customerId)
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        /*
          Make sure the current 5-day billing
          statement exists before returning statements.

          This allows payment to be recorded
          even when the current 5-day period
          is not yet complete.
        */
        await generateMonthlyBillingStatements();

        /*
          Now fetch the statements from the database.
        */
        const statements =
            await getBillingStatementsByCard(
                parsedCardId
            );

        return NextResponse.json(statements);
    } catch (error) {
        console.error(
            "Get billing statements error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Failed to get billing statements.",
            },
            { status: 500 }
        );
    }
}