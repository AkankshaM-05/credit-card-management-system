import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRiskAnalysis } from "@/lib/services/riskAnalysis";

export async function GET() {
    try {
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

        const analysis = await getRiskAnalysis();

        return NextResponse.json(analysis);
    } catch (error) {
        console.error(
            "Risk analysis error:",
            error
        );

        return NextResponse.json(
            { error: "Failed to fetch risk analysis." },
            { status: 500 }
        );
    }
}