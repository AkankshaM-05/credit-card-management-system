import { NextResponse } from "next/server";
import { getMerchants } from "@/lib/services/merchant";

export async function GET() {
    try {
        const merchants = await getMerchants();

        return NextResponse.json(merchants);
    } catch (error) {
        console.error("Failed to fetch merchants:", error);

        return NextResponse.json(
            { error: "Failed to fetch merchants" },
            { status: 500 }
        );
    }
}