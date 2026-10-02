import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
    createTransaction,
    getTransactionsByCard,
} from "@/lib/services/transaction";
import { getCardById } from "@/lib/services/card";

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (
        session.userType !== "MANAGER" &&
        session.userType !== "CUSTOMER"
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

        const card = await getCardById(Number(cardId));

        if (!card) {
            return NextResponse.json(
                { error: "Card not found." },
                { status: 404 }
            );
        }

        if (
            session.userType === "CUSTOMER" &&
            card.customerId !== String(session.customerId)
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const transactions = await getTransactionsByCard(
            Number(cardId)
        );

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Get transactions error:", error);

        return NextResponse.json(
            { error: "Failed to get transactions." },
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

    if (session.userType !== "EMPLOYEE") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const data = await request.json();

        if (
            !data.cardId ||
            !data.merchantId ||
            !data.amount ||
            !data.transactionDate ||
            !data.transactionType
        ) {
            return NextResponse.json(
                { error: "All transaction fields are required." },
                { status: 400 }
            );
        }

        // Check that the card exists and is active
        const card = await getCardById(Number(data.cardId));

        if (!card) {
            return NextResponse.json(
                { error: "Card not found." },
                { status: 404 }
            );
        }

        if (card.status !== "ACTIVE") {
            return NextResponse.json(
                {
                    error: `Transaction cannot be created. Card status is ${card.status}.`,
                },
                { status: 400 }
            );
        }

        const transaction = await createTransaction({
            cardId: Number(data.cardId),
            merchantId: Number(data.merchantId),
            amount: Number(data.amount),
            transactionDate: data.transactionDate,
            transactionType: data.transactionType,
        });

        return NextResponse.json(transaction, {
            status: 201,
        });
    } catch (error) {
        console.error("Create transaction error:", error);

        return NextResponse.json(
            { error: "Failed to create transaction." },
            { status: 500 }
        );
    }
}