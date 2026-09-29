import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const result = await pool.query(
            `
      SELECT
        ua.Username,
        ua.User_Type,
        ua.Customer_ID,
        ua.Staff_ID,
        COALESCE(c.Name, s.Name) AS Name
      FROM USER_ACCOUNT ua
      LEFT JOIN CUSTOMER c
        ON ua.Customer_ID = c.Customer_ID
      LEFT JOIN STAFF_USER s
        ON ua.Staff_ID = s.Staff_ID
      WHERE ua.User_ID = $1
      `,
            [session.userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "User not found." },
                { status: 404 }
            );
        }

        const user = result.rows[0];

        return NextResponse.json({
            username: user.username,
            name: user.name || "Admin",
            role: user.user_type,
            customerId: user.customer_id
                ? String(user.customer_id)
                : undefined,
            staffId: user.staff_id
                ? String(user.staff_id)
                : undefined,
        });
    } catch (error) {
        console.error("Get current user error:", error);

        return NextResponse.json(
            { error: "Failed to get current user." },
            { status: 500 }
        );
    }
}