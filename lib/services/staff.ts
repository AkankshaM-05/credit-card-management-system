import bcrypt from "bcrypt";
import pool from "../db";
import { StaffUser, StaffRole } from "../types";

export async function createStaff(data: {
    name: string;
    role: StaffRole;
    username: string;
    password: string;
}): Promise<StaffUser> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const staffResult = await client.query(
            `
      INSERT INTO STAFF_USER (Name, Role)
      VALUES ($1, $2)
      RETURNING Staff_ID, Name, Role
      `,
            [data.name, data.role]
        );

        const staff = staffResult.rows[0];

        const passwordHash = await bcrypt.hash(data.password, 10);

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
            id: String(staff.staff_id),
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
        id: String(row.staff_id),
        name: row.name,
        role: row.role,
    }));
}