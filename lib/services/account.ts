import pool from "../db";
import { UserAccount } from "../types";

export async function getAccounts(): Promise<UserAccount[]> {
    const result = await pool.query(
        `
    SELECT
      User_ID,
      Username,
      User_Type,
      Customer_ID,
      Staff_ID
    FROM USER_ACCOUNT
    ORDER BY User_ID
    `
    );

    return result.rows.map((row) => ({
        id: String(row.user_id),
        username: row.username,
        userType: row.user_type,
        customerId: row.customer_id
            ? String(row.customer_id)
            : undefined,
        staffId: row.staff_id
            ? String(row.staff_id)
            : undefined,
    }));
}

export async function getAccountCounts() {
    const result = await pool.query(
        `
    SELECT
      COUNT(*) FILTER (WHERE User_Type = 'CUSTOMER') AS customers,
      COUNT(*) FILTER (WHERE User_Type = 'EMPLOYEE') AS employees,
      COUNT(*) FILTER (WHERE User_Type = 'MANAGER') AS managers
    FROM USER_ACCOUNT
    `
    );

    const row = result.rows[0];

    return {
        totalCustomers: Number(row.customers),
        totalEmployees: Number(row.employees),
        totalManagers: Number(row.managers),
    };
}