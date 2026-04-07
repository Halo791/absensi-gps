import "dotenv/config";
import { Pool } from "pg";
import { schemaSql } from "./schema.js";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/attendance_demo";

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : false
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function migrate() {
  await pool.query(schemaSql);
}

export async function closePool() {
  await pool.end();
}
