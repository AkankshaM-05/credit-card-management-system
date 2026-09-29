import db from "@/lib/db";

export async function GET() {
    try {
        const result = await db.query("SELECT NOW()");

        return Response.json({
            success: true,
            time: result.rows[0].now,
        });
    } catch (error) {
        console.error(error);

        return Response.json(
            { success: false, message: "Database connection failed" },
            { status: 500 }
        );
    }
}