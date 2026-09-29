const bcrypt = require("bcrypt");
const { Client } = require("pg");

require("dotenv").config({ path: ".env.local" });

async function createAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const passwordHash = await bcrypt.hash(
            process.env.ADMIN_PASSWORD,
            10
        );

        await client.query(
            `INSERT INTO USER_ACCOUNT
       (Username, Password_Hash, User_Type)
       VALUES ($1, $2, 'ADMIN')`,
            [process.env.ADMIN_USERNAME, passwordHash]
        );

        console.log("Admin account created successfully.");
    } catch (error) {
        console.error("Failed to create admin:", error);
    } finally {
        await client.end();
    }
}

createAdmin();