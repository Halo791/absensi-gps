import { isDemoMode } from "./config.js";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { DEFAULT_SETTINGS, DEMO_ADMIN, DEMO_EMPLOYEE } from "./constants.js";
import { closePool, migrate, query } from "./db.js";
import { AppError } from "./errors.js";
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

async function createUser(user) {
  const passwordHash = bcrypt.hashSync(user.password, 10);
  const result = await query(
    `
      INSERT INTO users (name, role, nik, password_hash, department, position, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id
    `,
    [user.name, user.role, user.nik, passwordHash, user.department, user.position]
  );
  return result.rows[0].id;
}

async function createEmployeeRosterItem(user) {
  const employee = normalizeEmployeeRecord(user);
  const passwordHash = bcrypt.hashSync(employee.password, 10);
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
    [employee.name, employee.role, employee.nik, passwordHash, employee.department, employee.position, employee.isActive]
  );
}

async function seedAttendance(employeeId) {
  const today = dayjs();
  const rows = [
    {
      date: today.subtract(2, "day").format("YYYY-MM-DD"),
      in: `${today.subtract(2, "day").format("YYYY-MM-DD")}T08:03:00`,
      out: `${today.subtract(2, "day").format("YYYY-MM-DD")}T17:05:00`,
      status: "present"
    },
    {
      date: today.subtract(1, "day").format("YYYY-MM-DD"),
      in: `${today.subtract(1, "day").format("YYYY-MM-DD")}T08:17:00`,
      out: `${today.subtract(1, "day").format("YYYY-MM-DD")}T17:01:00`,
      status: "late"
    },
    {
      date: today.format("YYYY-MM-DD"),
      in: `${today.format("YYYY-MM-DD")}T08:01:00`,
      out: null,
      status: "checked_in"
    }
  ];

  for (const item of rows) {
    await query(
      `
        INSERT INTO attendance
        (user_id, date, check_in_time, check_out_time, status, lat, lng, method, shift_name, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [employeeId, item.date, item.in, item.out, item.status, -6.2, 106.8166, "gps_qr", "Shift Reguler", "Data demo"]
    );
  }
}

export async function resetDemoData() {
  if (!isDemoMode) {
    throw new AppError("Demo mode tidak aktif di environment ini.", 403);
  }
  await migrate();
  await query(`
    TRUNCATE TABLE overtime_requests, leave_requests, attendance, shifts, settings, users
    RESTART IDENTITY CASCADE
  `);

  const adminId = await createUser(DEMO_ADMIN);
  const employeeId = await createUser(DEMO_EMPLOYEE);

  for (const employee of EMPLOYEE_ROSTER) {
    await createEmployeeRosterItem(employee);
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

  await query(
    `
      INSERT INTO shifts
      (name, start_time, end_time, late_tolerance_minutes, early_leave_tolerance_minutes, is_active)
      VALUES
      ('Shift Pagi', '08:00', '17:00', 15, 15, true),
      ('Shift Siang', '13:00', '21:00', 10, 10, true)
    `
  );

  await seedAttendance(employeeId);

  await query(
    `
      INSERT INTO leave_requests
      (user_id, type, start_date, end_date, reason, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [employeeId, "sick", "2026-04-11", "2026-04-11", "Demam tinggi", "approved", dayjs().toISOString()]
  );

  await query(
    `
      INSERT INTO overtime_requests
      (user_id, date, start_time, end_time, reason, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [employeeId, "2026-04-06", "18:00", "20:00", "Stock opname", "approved", dayjs().toISOString()]
  );

  return { adminId, employeeId };
}

const isDirectRun = process.argv[1]?.endsWith("seed.js");

if (isDirectRun) {
  resetDemoData()
    .then(() => {
      console.log("Demo database berhasil di-reset.");
    })
    .finally(async () => {
      await closePool();
    });
}
