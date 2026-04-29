import "dotenv/config";
import { Pool } from "pg";
import { isProduction } from "./config.js";
import { schemaSql } from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && isProduction) {
  throw new Error("DATABASE_URL wajib diatur di environment production.");
}

const effectiveConnectionString =
  connectionString || "postgresql://postgres:postgres@localhost:5432/attendance_local";

export const pool = new Pool({
  connectionString: effectiveConnectionString,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : effectiveConnectionString.includes("sslmode=require")
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
