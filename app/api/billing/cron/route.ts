import { NextResponse } from "next/server";
import { generateMonthlyBillingStatements } from "@/lib/services/billing";

export async function GET(request: Request) {
    /*
      Protect the cron endpoint with a secret.
      Only the configured scheduler should be able
      to trigger automatic billing.
    */
    const authHeader = request.headers.get("authorization");

    if (
        !process.env.CRON_SECRET ||
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const result =
            await generateMonthlyBillingStatements();

        return NextResponse.json({
            success: true,
            message: "Monthly billing statements generated.",
            generated: result.generated,
            skipped: result.skipped,
        });
    } catch (error) {
        console.error(
            "Automatic billing error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate monthly billing statements.",
            },
            { status: 500 }
        );
    }
}