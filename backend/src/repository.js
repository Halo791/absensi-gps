import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import QRCode from "qrcode";
import { query } from "./db.js";

function mapUser(row) {
  return row
    ? {
        ...row,
        is_active: Boolean(row.is_active)
      }
    : null;
}

export async function getUserByNik(nik) {
  const result = await query("SELECT * FROM users WHERE nik = $1", [nik]);
  return result.rows[0] || null;
}

export async function getUserById(id) {
  const result = await query(
    "SELECT id, name, role, nik, department, position, is_active FROM users WHERE id = $1",
    [id]
  );
  return mapUser(result.rows[0]);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export async function listEmployees() {
  const result = await query(
    `
      SELECT id, nik, name, department, position, is_active
      FROM users
      WHERE role = 'employee'
      ORDER BY id ASC
    `
  );
  return result.rows.map(mapUser);
}

export async function createEmployee(payload) {
  const passwordHash = bcrypt.hashSync(payload.password, 10);
  const result = await query(
    `
      INSERT INTO users (name, role, nik, password_hash, department, position, is_active)
      VALUES ($1, 'employee', $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [payload.name, payload.nik, passwordHash, payload.department, payload.position, Boolean(payload.isActive)]
  );
  return getUserById(result.rows[0].id);
}

export async function updateEmployee(id, payload) {
  await query(
    `
      UPDATE users
      SET name = $1, nik = $2, department = $3, position = $4, is_active = $5
      WHERE id = $6 AND role = 'employee'
    `,
    [payload.name, payload.nik, payload.department, payload.position, Boolean(payload.isActive), id]
  );
  return getUserById(id);
}

export async function deleteEmployee(id) {
  await query("DELETE FROM users WHERE id = $1 AND role = 'employee'", [id]);
}

export async function resetEmployeePassword(id, password) {
  const passwordHash = bcrypt.hashSync(password, 10);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
}

export async function getSettingsBundle() {
  const result = await query("SELECT key, value FROM settings");
  return result.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function getSetting(key) {
  const result = await query("SELECT value FROM settings WHERE key = $1", [key]);
  return result.rows[0]?.value || null;
}

export async function saveSetting(key, value) {
  await query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `,
    [key, JSON.stringify(value)]
  );
  return getSetting(key);
}

export async function listShifts() {
  const result = await query(
    `
      SELECT id, name, start_time AS "startTime", end_time AS "endTime",
             late_tolerance_minutes AS "lateToleranceMinutes",
             early_leave_tolerance_minutes AS "earlyLeaveToleranceMinutes",
             is_active AS "isActive"
      FROM shifts
      ORDER BY id ASC
    `
  );
  return result.rows.map((row) => ({
    ...row,
    isActive: Boolean(row.isActive)
  }));
}

export async function replaceShifts(shifts) {
  await query("DELETE FROM shifts");
  for (const item of shifts) {
    await query(
      `
        INSERT INTO shifts
        (name, start_time, end_time, late_tolerance_minutes, early_leave_tolerance_minutes, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        item.name,
        item.startTime,
        item.endTime,
        item.lateToleranceMinutes,
        item.earlyLeaveToleranceMinutes,
        Boolean(item.isActive)
      ]
    );
  }
  return listShifts();
}

export async function getDashboardSummary() {
  const today = dayjs().format("YYYY-MM-DD");
  const statsResult = await query(
    `
      SELECT
        COUNT(*)::int AS "totalAttendance",
        COALESCE(SUM(CASE WHEN status IN ('present', 'checked_in') THEN 1 ELSE 0 END), 0)::int AS "presentCount",
        COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0)::int AS "lateCount",
        COALESCE(SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END), 0)::int AS "leaveCount"
      FROM attendance
      WHERE date = $1
    `,
    [today]
  );

  const employeeCountResult = await query(
    "SELECT COUNT(*)::int AS count FROM users WHERE role = 'employee' AND is_active = true"
  );
  const leavePendingResult = await query(
    "SELECT COUNT(*)::int AS count FROM leave_requests WHERE status = 'pending'"
  );
  const overtimePendingResult = await query(
    "SELECT COUNT(*)::int AS count FROM overtime_requests WHERE status = 'pending'"
  );
  const monthlyResult = await query(
    `
      SELECT date, status
      FROM attendance
      WHERE to_char(date, 'YYYY-MM') = $1
      ORDER BY date ASC
    `,
    [dayjs().format("YYYY-MM")]
  );

  const stats = statsResult.rows[0];
  const employeeCount = employeeCountResult.rows[0].count;

  return {
    today,
    totals: {
      employees: employeeCount,
      present: stats.presentCount,
      late: stats.lateCount,
      leave: stats.leaveCount,
      absent: Math.max(employeeCount - stats.totalAttendance, 0),
      pendingLeave: leavePendingResult.rows[0].count,
      pendingOvertime: overtimePendingResult.rows[0].count
    },
    monthlyTrend: monthlyResult.rows
  };
}

export async function listAttendance(filters = {}) {
  let queryText = `
    SELECT a.id, a.date::text AS date, a.check_in_time AS "checkInTime", a.check_out_time AS "checkOutTime",
           a.status, a.method, a.lat, a.lng, u.name, u.nik, u.department
    FROM attendance a
    JOIN users u ON u.id = a.user_id
    WHERE 1 = 1
  `;
  const params = [];
  if (filters.status) {
    params.push(filters.status);
    queryText += ` AND a.status = $${params.length}`;
  }
  if (filters.department) {
    params.push(filters.department);
    queryText += ` AND u.department = $${params.length}`;
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    queryText += ` AND a.date >= $${params.length}`;
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    queryText += ` AND a.date <= $${params.length}`;
  }
  queryText += " ORDER BY a.date DESC, a.id DESC";
  const result = await query(queryText, params);
  return result.rows;
}

export async function listLeaveRequests(userId = null) {
  let queryText = `
    SELECT lr.id, lr.type, lr.start_date::text AS "startDate", lr.end_date::text AS "endDate", lr.reason, lr.status,
           u.name, u.nik
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
  `;
  const params = [];
  if (userId) {
    params.push(userId);
    queryText += ` WHERE user_id = $${params.length}`;
  }
  queryText += " ORDER BY lr.id DESC";
  const result = await query(queryText, params);
  return result.rows;
}

export async function createLeaveRequest(userId, payload) {
  const result = await query(
    `
      INSERT INTO leave_requests
      (user_id, type, start_date, end_date, reason, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING id, type, start_date::text AS "startDate", end_date::text AS "endDate", reason, status
    `,
    [userId, payload.type, payload.startDate, payload.endDate, payload.reason, dayjs().toISOString()]
  );
  return result.rows[0];
}

export async function updateLeaveStatus(id, status) {
  await query("UPDATE leave_requests SET status = $1 WHERE id = $2", [status, id]);
}

export async function listOvertimeRequests(userId = null) {
  let queryText = `
    SELECT o.id, o.date::text AS date, o.start_time AS "startTime", o.end_time AS "endTime", o.reason, o.status,
           u.name, u.nik
    FROM overtime_requests o
    JOIN users u ON u.id = o.user_id
  `;
  const params = [];
  if (userId) {
    params.push(userId);
    queryText += ` WHERE user_id = $${params.length}`;
  }
  queryText += " ORDER BY o.id DESC";
  const result = await query(queryText, params);
  return result.rows;
}

export async function createOvertimeRequest(userId, payload) {
  const result = await query(
    `
      INSERT INTO overtime_requests
      (user_id, date, start_time, end_time, reason, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING id, date::text AS date, start_time AS "startTime", end_time AS "endTime", reason, status
    `,
    [userId, payload.date, payload.startTime, payload.endTime, payload.reason, dayjs().toISOString()]
  );
  return result.rows[0];
}

export async function updateOvertimeStatus(id, status) {
  await query("UPDATE overtime_requests SET status = $1 WHERE id = $2", [status, id]);
}

export async function getCurrentQrPayload() {
  const qr = await getSetting("qr");
  const value =
    qr.type === "static"
      ? qr.staticValue
      : `DEMO|${dayjs().format("YYYYMMDDHHmm")}|${Math.floor(dayjs().second() / 30)}`;
  return {
    value,
    mode: qr.type
  };
}

export async function getCurrentQrCode() {
  const payload = await getCurrentQrPayload();
  const image = await QRCode.toDataURL(payload.value);
  return {
    ...payload,
    image
  };
}

export async function listEmployeeAttendance(userId) {
  const result = await query(
    `
      SELECT id, date::text AS date, check_in_time AS "checkInTime", check_out_time AS "checkOutTime", status, method
      FROM attendance
      WHERE user_id = $1
      ORDER BY date DESC, id DESC
    `,
    [userId]
  );
  return result.rows;
}

function deriveStatus(workSchedule, timestamp, isCheckOut = false) {
  const shift = workSchedule.singleShift;
  const target = dayjs(`${dayjs().format("YYYY-MM-DD")}T${isCheckOut ? shift.endTime : shift.startTime}:00`);
  const actual = dayjs(timestamp);
  const tolerance = isCheckOut ? shift.earlyLeaveToleranceMinutes : shift.lateToleranceMinutes;
  const diff = isCheckOut ? target.diff(actual, "minute") : actual.diff(target, "minute");

  if (!isCheckOut && diff > workSchedule.cutoffMinutes) {
    return "alpha";
  }
  if (diff > tolerance) {
    return isCheckOut ? "early_leave" : "late";
  }
  return isCheckOut ? "checked_out" : "present";
}

export async function submitAttendance(userId, payload) {
  const workSchedule = await getSetting("workSchedule");
  const today = dayjs().format("YYYY-MM-DD");
  const existingResult = await query(
    `
      SELECT *
      FROM attendance
      WHERE user_id = $1 AND date = $2
      ORDER BY id DESC
      LIMIT 1
    `,
    [userId, today]
  );
  const record = existingResult.rows[0];

  if (!record || !record.check_in_time) {
    const status = deriveStatus(workSchedule, payload.timestamp, false);
    const insertResult = await query(
      `
        INSERT INTO attendance
        (user_id, date, check_in_time, check_out_time, status, lat, lng, method, shift_name, note)
        VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9)
        RETURNING id, date::text AS date, check_in_time AS "checkInTime", check_out_time AS "checkOutTime", status, method
      `,
      [
        userId,
        today,
        payload.timestamp,
        status,
        payload.lat,
        payload.lng,
        payload.method,
        workSchedule.singleShift.name,
        payload.note || "Check-in demo"
      ]
    );
    return insertResult.rows[0];
  }

  const status = deriveStatus(workSchedule, payload.timestamp, true);
  const updateResult = await query(
    `
      UPDATE attendance
      SET check_out_time = $1, status = $2, note = $3
      WHERE id = $4
      RETURNING id, date::text AS date, check_in_time AS "checkInTime", check_out_time AS "checkOutTime", status, method
    `,
    [payload.timestamp, status, payload.note || "Check-out demo", record.id]
  );
  return updateResult.rows[0];
}
