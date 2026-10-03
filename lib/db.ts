import { Pool, types } from "pg";

types.setTypeParser(1082, (value) => value);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=Asia/Kolkata",
});

export default pool;