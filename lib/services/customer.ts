import bcrypt from "bcrypt";
import pool from "../db";
import { Customer } from "../types";

async function generateUniqueCustomerId(): Promise<string> {
    while (true) {
        const randomNumber = Math.floor(
            1000000 + Math.random() * 9000000
        );

        const customerId = `CUS${randomNumber}`;

        const result = await pool.query(
            `
            SELECT 1
            FROM CUSTOMER
            WHERE Customer_ID = $1
            `,
            [customerId]
        );

        if (result.rows.length === 0) {
            return customerId;
        }
    }
}

export async function createCustomer(data: {
    name: string;
    phone: string;
    email: string;
    username: string;
    password: string;
}): Promise<Customer> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const customerId = await generateUniqueCustomerId();

        const customerResult = await client.query(
            `
            INSERT INTO CUSTOMER
                (Customer_ID, Name, Phone, Email)
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                Customer_ID,
                Name,
                Phone,
                Email
            `,
            [
                customerId,
                data.name,
                data.phone,
                data.email,
            ]
        );

        const customer = customerResult.rows[0];

        const passwordHash = await bcrypt.hash(
            data.password,
            10
        );

        await client.query(
            `
            INSERT INTO USER_ACCOUNT
                (Username, Password_Hash, User_Type, Customer_ID)
            VALUES
                ($1, $2, 'CUSTOMER', $3)
            `,
            [
                data.username,
                passwordHash,
                customer.customer_id,
            ]
        );

        await client.query("COMMIT");

        return {
            id: customer.customer_id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function searchCustomers(
    query: string
): Promise<Customer[]> {
    const search = `%${query}%`;

    const result = await pool.query(
        `
        SELECT
            Customer_ID,
            Name,
            Phone,
            Email
        FROM CUSTOMER
        WHERE Customer_ID ILIKE $1
        ORDER BY Name ASC
        LIMIT 10
        `,
        [search]
    );

    return result.rows.map((row) => ({
        id: row.customer_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
    }));
}

export async function getCustomers(): Promise<Customer[]> {
    const result = await pool.query(
        `
        SELECT
            Customer_ID,
            Name,
            Phone,
            Email
        FROM CUSTOMER
        ORDER BY Customer_ID
        `
    );

    return result.rows.map((row) => ({
        id: row.customer_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
    }));
}

export async function getCustomerById(
    customerId: string
): Promise<Customer | null> {
    const result = await pool.query(
        `
        SELECT
            Customer_ID,
            Name,
            Phone,
            Email
        FROM CUSTOMER
        WHERE Customer_ID = $1
        `,
        [customerId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    return {
        id: row.customer_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
    };
}

export async function getMyCustomer(
    userId: number
): Promise<Customer | null> {
    const result = await pool.query(
        `
        SELECT
            c.Customer_ID,
            c.Name,
            c.Phone,
            c.Email
        FROM USER_ACCOUNT ua
        JOIN CUSTOMER c
            ON ua.Customer_ID = c.Customer_ID
        WHERE
            ua.User_ID = $1
            AND ua.User_Type = 'CUSTOMER'
        `,
        [userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    return {
        id: row.customer_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
    };
}