import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
    createCard,
    getCardsByCustomer,
    getCardById,
    getPendingApprovalCards,
    updateCardStatus,
} from "@/lib/services/card";

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);

        const customerId = searchParams.get("customerId");
        const cardId = searchParams.get("id");
        const me = searchParams.get("me");
        const status = searchParams.get("status");

        // Pending approval cards for Manager
        if (status === "PENDING_APPROVAL") {
            if (session.userType !== "MANAGER") {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            const cards = await getPendingApprovalCards();

            return NextResponse.json(cards);
        }

        // Customer's own cards
        if (me === "true") {
            if (session.userType !== "CUSTOMER") {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            if (!session.customerId) {
                return NextResponse.json(
                    { error: "Customer ID not found." },
                    { status: 404 }
                );
            }

            const cards = await getCardsByCustomer(
                session.customerId
            );

            return NextResponse.json(cards);
        }

        // Specific card
        if (cardId) {
            if (
                session.userType !== "CUSTOMER" &&
                session.userType !== "EMPLOYEE" &&
                session.userType !== "MANAGER"
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
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
                card.customerId !== session.customerId
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            return NextResponse.json(card);
        }

        // Cards of a specific customer
        if (customerId) {
            if (
                session.userType !== "EMPLOYEE" &&
                session.userType !== "MANAGER"
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            const cards = await getCardsByCustomer(customerId);

            return NextResponse.json(cards);
        }

        return NextResponse.json(
            { error: "Card ID or customer ID is required." },
            { status: 400 }
        );
    } catch (error) {
        console.error("Get cards error:", error);

        return NextResponse.json(
            { error: "Failed to get cards." },
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
            !data.customerId ||
            !data.creditLimit ||
            !data.issueDate ||
            !data.expiryDate
        ) {
            return NextResponse.json(
                { error: "All card fields are required." },
                { status: 400 }
            );
        }

        const card = await createCard({
            customerId: String(data.customerId),
            creditLimit: Number(data.creditLimit),
            issueDate: data.issueDate,
            expiryDate: data.expiryDate,
        });

        return NextResponse.json(card, {
            status: 201,
        });
    } catch (error) {
        console.error("Create card error:", error);

        return NextResponse.json(
            { error: "Failed to create card." },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (session.userType !== "MANAGER") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const cardId = searchParams.get("id");

        if (!cardId) {
            return NextResponse.json(
                { error: "Card ID is required." },
                { status: 400 }
            );
        }

        const data = await request.json();

        if (!data.status) {
            return NextResponse.json(
                { error: "Card status is required." },
                { status: 400 }
            );
        }

        if (!session.staffId) {
            return NextResponse.json(
                { error: "Staff ID not found." },
                { status: 404 }
            );
        }

        const card = await updateCardStatus(
            Number(cardId),
            data.status,
            session.staffId,
            data.reason
        );

        if (!card) {
            return NextResponse.json(
                { error: "Card not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error("Update card status error:", error);

        return NextResponse.json(
            { error: "Failed to update card status." },
            { status: 500 }
        );
    }
}