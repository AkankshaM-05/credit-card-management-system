import bcrypt from "bcrypt";
import db from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return Response.json(
                { success: false, message: "Username and password are required" },
                { status: 400 }
            );
        }

        const result = await db.query(
            `SELECT
                User_ID,
                Username,
                Password_Hash,
                User_Type,
                Customer_ID,
                Staff_ID
             FROM USER_ACCOUNT
             WHERE Username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return Response.json(
                { success: false, message: "Invalid username or password" },
                { status: 401 }
            );
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return Response.json(
                { success: false, message: "Invalid username or password" },
                { status: 401 }
            );
        }

        await createSession(
            user.user_id,
            user.user_type,
            user.customer_id,
            user.staff_id
        );

        return Response.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.user_id,
                username: user.username,
                userType: user.user_type,
            },
        });
    } catch (error) {
        console.error(error);

        return Response.json(
            { success: false, message: "Something went wrong" },
            { status: 500 }
        );
    }
}