import pool from "../db";
import { Merchant } from "../types";

export async function getMerchants(): Promise<Merchant[]> {
    const result = await pool.query(
        `
        SELECT
            Merchant_ID,
            Merchant_Name,
            Category
        FROM MERCHANT
        ORDER BY Merchant_Name ASC
        `
    );

    return result.rows.map((row) => ({
        id: String(row.merchant_id),
        name: row.merchant_name,
        category: row.category ?? undefined,
    }));
}