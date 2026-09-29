import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
    getAccounts,
    getAccountCounts,
} from "@/lib/services/account";

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (session.userType !== "ADMIN") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const summary = searchParams.get("summary");

        if (summary === "true") {
            const counts = await getAccountCounts();

            return NextResponse.json(counts);
        }

        const accounts = await getAccounts();

        return NextResponse.json(accounts);
    } catch (error) {
        console.error("Get accounts error:", error);

        return NextResponse.json(
            { error: "Failed to get accounts." },
            { status: 500 }
        );
    }
}