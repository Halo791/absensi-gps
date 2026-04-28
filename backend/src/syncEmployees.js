import bcrypt from "bcryptjs";
import { closePool, migrate, query } from "./db.js";
import { EMPLOYEE_ROSTER, normalizeEmployeeRecord } from "./employeeRoster.js";

async function upsertEmployee(employee) {
  const normalized = normalizeEmployeeRecord(employee);
  const passwordHash = bcrypt.hashSync(normalized.password, 10);
  await query(
    `
      INSERT INTO users (name, role, nik, password_hash, department, position, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (nik) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        department = EXCLUDED.department,
        position = EXCLUDED.position,
        is_active = EXCLUDED.is_active
    `,
    [
      normalized.name,
      normalized.role,
      normalized.nik,
      passwordHash,
      normalized.department,
      normalized.position,
      normalized.isActive
    ]
  );
}

async function main() {
  await migrate();
  for (const employee of EMPLOYEE_ROSTER) {
    await upsertEmployee(employee);
  }
  console.log(`Berhasil sinkron ${EMPLOYEE_ROSTER.length} akun karyawan ke database.`);
}

main()
  .catch((error) => {
    console.error("Gagal sinkron akun karyawan:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
