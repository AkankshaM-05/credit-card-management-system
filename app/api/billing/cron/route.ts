import { NextResponse } from "next/server";
import { generateWeeklyBillingStatements } from "@/lib/services/billing";
import { sendBillingDueReminders } from "@/lib/services/email";

export async function GET(request: Request) {
    /*
      Protect the cron endpoint with a secret.
      Only the configured scheduler should be able
      to trigger automatic billing and payment reminders.
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
        const billingResult =
            await generateWeeklyBillingStatements();

        const emailResult =
            await sendBillingDueReminders();

        return NextResponse.json({
            success: true,
            message:
                "Weekly billing statements generated and payment reminders processed.",
            generated: billingResult.generated,
            skipped: billingResult.skipped,
            emailsFound: emailResult.found,
            emailsSent: emailResult.sent,
        });
    } catch (error) {
        console.error(
            "Automatic billing and email error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate billing statements and payment reminders.",
            },
            { status: 500 }
        );
    }
}