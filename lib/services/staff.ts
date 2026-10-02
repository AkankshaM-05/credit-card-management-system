import bcrypt from "bcrypt";
import pool from "../db";
import { StaffUser, StaffRole } from "../types";

async function generateUniqueStaffId(
    role: StaffRole
): Promise<string> {
    const prefix = role === "EMPLOYEE" ? "EMP" : "MGR";

    while (true) {
        const randomNumber = Math.floor(
            1000000 + Math.random() * 9000000
        );

        const staffId = `${prefix}${randomNumber}`;

        const result = await pool.query(
            `
            SELECT 1
            FROM STAFF_USER
            WHERE Staff_ID = $1
            `,
            [staffId]
        );

        if (result.rows.length === 0) {
            return staffId;
        }
    }
}

export async function createStaff(data: {
    name: string;
    role: StaffRole;
    username: string;
    password: string;
}): Promise<StaffUser> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const staffId = await generateUniqueStaffId(
            data.role
        );

        const staffResult = await client.query(
            `
            INSERT INTO STAFF_USER
                (Staff_ID, Name, Role)
            VALUES
                ($1, $2, $3)
            RETURNING
                Staff_ID,
                Name,
                Role
            `,
            [
                staffId,
                data.name,
                data.role,
            ]
        );

        const staff = staffResult.rows[0];

        const passwordHash = await bcrypt.hash(
            data.password,
            10
        );

        await client.query(
            `
            INSERT INTO USER_ACCOUNT
                (Username, Password_Hash, User_Type, Staff_ID)
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                data.username,
                passwordHash,
                data.role,
                staff.staff_id,
            ]
        );

        await client.query("COMMIT");

        return {
            id: staff.staff_id,
            name: staff.name,
            role: staff.role,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getStaff(): Promise<StaffUser[]> {
    const result = await pool.query(
        `
        SELECT
            Staff_ID,
            Name,
            Role
        FROM STAFF_USER
        ORDER BY Staff_ID
        `
    );

    return result.rows.map((row) => ({
        id: row.staff_id,
        name: row.name,
        role: row.role,
    }));
}