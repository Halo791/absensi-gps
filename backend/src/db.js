import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, "..", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

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
