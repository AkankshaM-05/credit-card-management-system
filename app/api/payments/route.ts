import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
    createPayment,
    getPaymentsByCard,
} from "@/lib/services/payment";
import { getCardById } from "@/lib/services/card";

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
      payment information.

      Employee needs this for the payment-recording
      workflow.
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
          Customer can only view payments
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

        const payments = await getPaymentsByCard(
            parsedCardId
        );

        return NextResponse.json(payments);
    } catch (error) {
        console.error("Get payments error:", error);

        return NextResponse.json(
            { error: "Failed to get payments." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    /*
      Only Employee can manually record payments.
    */
    if (session.userType !== "EMPLOYEE") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const data = await request.json();

        /*
          Payment status is NOT accepted from the frontend.
          A manually recorded valid payment is automatically
          saved as SUCCESS by the payment service.
        */
        if (
            !data.statementId ||
            !data.amountPaid ||
            !data.paymentDate
        ) {
            return NextResponse.json(
                {
                    error:
                        "Statement ID, payment amount and payment date are required.",
                },
                { status: 400 }
            );
        }

        const statementId = Number(data.statementId);
        const amountPaid = Number(data.amountPaid);

        if (
            !Number.isInteger(statementId) ||
            statementId <= 0
        ) {
            return NextResponse.json(
                { error: "Invalid statement ID." },
                { status: 400 }
            );
        }

        if (
            !Number.isFinite(amountPaid) ||
            amountPaid <= 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Payment amount must be greater than 0.",
                },
                { status: 400 }
            );
        }

        const payment = await createPayment({
            statementId,
            amountPaid,
            paymentDate: data.paymentDate,
        });

        return NextResponse.json(payment, {
            status: 201,
        });
    } catch (error) {
        console.error("Create payment error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to record payment.",
            },
            { status: 500 }
        );
    }
}