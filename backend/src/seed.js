import bcrypt from "bcryptjs";
import { DEFAULT_ADMIN, DEFAULT_SETTINGS } from "./constants.js";
import { closePool, migrate, query } from "./db.js";
import { EMPLOYEE_ROSTER, normalizeEmployeeRecord } from "./employeeRoster.js";

async function upsertSetting(key, value) {
  await query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `,
    [key, JSON.stringify(value)]
  );
}

async function upsertUser(user) {
  const normalized = normalizeEmployeeRecord(user);
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
    [normalized.name, normalized.role, normalized.nik, passwordHash, normalized.department, normalized.position, normalized.isActive]
  );
}

async function upsertDefaultShifts() {
  const shiftsResult = await query("SELECT COUNT(*)::int AS count FROM shifts");
  if (shiftsResult.rows[0].count > 0) {
    return;
  }

  await query(
    `
      INSERT INTO shifts
      (name, start_time, end_time, late_tolerance_minutes, early_leave_tolerance_minutes, is_active)
      VALUES
      ('Shift Pagi', '08:00', '17:00', 15, 15, true),
      ('Shift Siang', '13:00', '21:00', 10, 10, true)
    `
  );
}

export async function seedInitialData() {
  await migrate();

  await upsertUser(DEFAULT_ADMIN);
  for (const employee of EMPLOYEE_ROSTER) {
    await upsertUser(employee);
  }

  await upsertSetting("general", {
    companyName: DEFAULT_SETTINGS.companyName,
    timezone: DEFAULT_SETTINGS.timezone,
    backendUrl: DEFAULT_SETTINGS.backendUrl
  });
  await upsertSetting("workSchedule", DEFAULT_SETTINGS.workSchedule);
  await upsertSetting("gps", DEFAULT_SETTINGS.gps);
  await upsertSetting("qr", DEFAULT_SETTINGS.qr);
  await upsertSetting("security", DEFAULT_SETTINGS.security);

  await upsertDefaultShifts();
}

const isDirectRun = process.argv[1]?.endsWith("seed.js");

if (isDirectRun) {
  seedInitialData()
    .then(() => {
      console.log("Data awal berhasil disinkronkan.");
    })
    .finally(async () => {
      await closePool();
    });
}
