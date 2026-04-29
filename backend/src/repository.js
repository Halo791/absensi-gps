import crypto from "crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import QRCode from "qrcode";
import { query } from "./db.js";
import { getQrSecret } from "./config.js";

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
  if (filters.name) {
    params.push(`%${filters.name}%`);
    queryText += ` AND u.name ILIKE $${params.length}`;
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
  const value = qr.type === "static" ? qr.staticValue : createDynamicQrToken();
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

function getDayName(date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayjs(date).day()];
}

function isWorkingDay(date, workSchedule) {
  if (!workSchedule) return true;
  if (Array.isArray(workSchedule.holidays) && workSchedule.holidays.includes(date)) {
    return false;
  }
  if (Array.isArray(workSchedule.workDays) && workSchedule.workDays.length > 0) {
    return workSchedule.workDays.includes(getDayName(date));
  }
  return true;
}

function normalizeDate(value, fallback) {
  const normalized = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  return fallback;
}

function getDateRange(startDate, endDate) {
  const dates = [];
  let cursor = dayjs(startDate);
  const last = dayjs(endDate);

  while (cursor.isSame(last, "day") || cursor.isBefore(last, "day")) {
    dates.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }

  return dates;
}

function formatClock(value) {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("hh:mm A") : String(value).slice(0, 8);
}

function formatWibClock(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 5);
  }
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);
}

function formatWibLabel(value) {
  const time = formatWibClock(value);
  return time ? `${time} WIB (UTC+7)` : "";
}

function getPrimaryShift(workSchedule) {
  if (!workSchedule) return null;
  if (workSchedule.type === "single") {
    return workSchedule.singleShift || null;
  }

  const shifts = (workSchedule.shifts || []).filter((shift) => shift?.isActive !== false);
  return shifts[0] || workSchedule.shifts?.[0] || null;
}

function getDailyCutoffTime(date, workSchedule) {
  if (!workSchedule) {
    return dayjs(`${date}T17:00:00`);
  }

  if (workSchedule.type === "single") {
    const shift = workSchedule.singleShift || {};
    const endTime = shift.endTime || "17:00";
    const cutoffMinutes = Number(workSchedule.cutoffMinutes || 0);
    return dayjs(`${date}T${endTime}:00`).add(cutoffMinutes, "minute");
  }

  const shifts = (workSchedule.shifts || []).filter((shift) => shift?.isActive !== false);
  if (!shifts.length) {
    return dayjs(`${date}T17:00:00`);
  }

  const latestEnd = shifts.reduce((latest, shift) => {
    if (!latest) return shift;
    return dayjs(`${date}T${shift.endTime}:00`).isAfter(dayjs(`${date}T${latest.endTime}:00`)) ? shift : latest;
  }, null);
  const cutoffMinutes = Number(workSchedule.cutoffMinutes || 0);
  return dayjs(`${date}T${latestEnd.endTime}:00`).add(cutoffMinutes, "minute");
}

function calculateLateMinutes(date, checkInTime, workSchedule) {
  const shift = getPrimaryShift(workSchedule);
  if (!shift?.startTime || !checkInTime) return "";

  const scheduledStart = dayjs(`${date}T${shift.startTime}:00`);
  const actualStart = dayjs(checkInTime);
  if (!actualStart.isValid()) return "";

  const diff = actualStart.diff(scheduledStart, "minute");
  return Math.max(diff, 0);
}

function escapeReportCell(value) {
  const normalized = value == null ? "" : String(value);
  if (!/[\";\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toExcelDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().replace("Z", "");
}

function formatReportCell(row) {
  if (!row) return "";

  if (row.status === "alpha") {
    return "ALPHA";
  }

  if (row.status === "leave") {
    return "IZIN";
  }

  const checkIn = formatWibClock(row.checkInTimeRaw || row.checkInTime);
  const checkOut = formatWibClock(row.checkOutTimeRaw || row.checkOutTime);
  if (checkIn || checkOut) {
    return `${formatWibLabel(row.checkInTimeRaw || row.checkInTime) || "-"} - ${formatWibLabel(row.checkOutTimeRaw || row.checkOutTime) || "-"}`;
  }

  return String(row.status || "").replaceAll("_", " ").toUpperCase();
}

function getReportCellStyle(row) {
  if (!row) {
    return "";
  }

  if (row.status === "alpha") {
    return "background:#f8d7da;color:#842029;font-weight:700;";
  }

  if (row.status === "leave") {
    return "background:#d1e7dd;color:#0f5132;font-weight:700;";
  }

  if (row.status === "late" || (Number(row.lateMinutes) > 0 && row.status !== "alpha" && row.status !== "leave")) {
    return "background:#ffe5b4;color:#8a4b00;font-weight:700;";
  }

  return "";
}

export async function getAttendanceReportRows(filters = {}) {
  const settings = await getSettingsBundle();
  const workSchedule = settings.workSchedule || null;
  const today = dayjs().format("YYYY-MM-DD");
  const startDate = normalizeDate(filters.startDate, normalizeDate(filters.endDate, today));
  const endDate = normalizeDate(filters.endDate, normalizeDate(filters.startDate, today));
  const rangeStart = dayjs(startDate).isAfter(dayjs(endDate), "day") ? endDate : startDate;
  const rangeEnd = dayjs(startDate).isAfter(dayjs(endDate), "day") ? startDate : endDate;
  const dates = getDateRange(rangeStart, rangeEnd);

  const employeeResult = await query(
    `
      SELECT id, nik, name, department
      FROM users
      WHERE role = 'employee'
      ORDER BY name ASC, nik ASC
    `
  );
  const employees = employeeResult.rows;
  const activeEmployeeIds = new Set(
    (await query("SELECT id FROM users WHERE role = 'employee' AND is_active = true")).rows.map((row) => row.id)
  );

  const attendanceResult = await query(
    `
      SELECT a.id, a.date::text AS date, a.check_in_time AS "checkInTime", a.check_out_time AS "checkOutTime",
             a.status, a.method, u.id AS "userId", u.nik, u.name, u.department
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE a.date BETWEEN $1 AND $2
        ${filters.name ? "AND u.name ILIKE $3" : ""}
      ORDER BY a.date DESC, u.name ASC, a.id DESC
    `,
    filters.name ? [rangeStart, rangeEnd, `%${filters.name}%`] : [rangeStart, rangeEnd]
  );

  const attendanceMap = new Map();
  for (const row of attendanceResult.rows) {
    attendanceMap.set(`${row.date}:${row.userId}`, row);
  }

  const now = dayjs();
  const reportRows = [];

  for (const date of dates) {
    const workingDay = isWorkingDay(date, workSchedule);
    const cutoffTime = getDailyCutoffTime(date, workSchedule);
    const alphaAllowed = workingDay && (dayjs(date).isBefore(now, "day") || now.isAfter(cutoffTime));

    for (const employee of employees) {
      if (!activeEmployeeIds.has(employee.id)) {
        continue;
      }
      if (filters.name && !employee.name.toLowerCase().includes(String(filters.name).toLowerCase())) {
        continue;
      }
      const attendance = attendanceMap.get(`${date}:${employee.id}`) || null;
      const rowStatus = attendance?.status || (alphaAllowed ? "alpha" : null);

      if (!rowStatus) {
        continue;
      }

      const row = {
        date,
        nik: employee.nik,
        name: employee.name,
        department: employee.department,
        checkInTimeRaw: attendance?.checkInTime || null,
        checkOutTimeRaw: attendance?.checkOutTime || null,
        checkInTime: attendance?.checkInTime ? formatClock(attendance.checkInTime) : "-",
        checkOutTime: attendance?.checkOutTime ? formatClock(attendance.checkOutTime) : "-",
        lateMinutes: attendance?.checkInTime ? calculateLateMinutes(date, attendance.checkInTime, workSchedule) : "-",
        status: rowStatus
      };

      if (filters.department && row.department !== filters.department) {
        continue;
      }
      if (filters.status && row.status !== filters.status) {
        continue;
      }

      reportRows.push(row);
    }
  }

  return reportRows.sort((left, right) => {
    if (left.date === right.date) {
      return left.name.localeCompare(right.name);
    }
    return left.date < right.date ? 1 : -1;
  });
}

export function formatAttendanceReportCsv(rows) {
  const employeeMap = new Map();
  const dates = [];

  for (const row of rows) {
    if (!employeeMap.has(row.nik)) {
      employeeMap.set(row.nik, {
        nik: row.nik,
        name: row.name,
        department: row.department,
        attendanceByDate: new Map()
      });
    }

    const employee = employeeMap.get(row.nik);
    employee.attendanceByDate.set(row.date, row);

    if (!dates.includes(row.date)) {
      dates.push(row.date);
    }
  }

  dates.sort();
  const employees = [...employeeMap.values()].sort((left, right) => {
    if (left.name === right.name) {
      return String(left.nik).localeCompare(String(right.nik));
    }
    return left.name.localeCompare(right.name);
  });

  const header = ["NIK", "Nama", "Departemen", ...dates.map((date) => dayjs(date).format("DD/MM"))];
  const lines = ["sep=;", header.map(escapeReportCell).join(";")];

  for (const employee of employees) {
    lines.push(
      [
        employee.nik,
        employee.name,
        employee.department || "-",
        ...dates.map((date) => escapeReportCell(formatReportCell(employee.attendanceByDate.get(date))))
      ].join(";")
    );
  }

  return lines.join("\n");
}

export function formatAttendanceReportXls(rows) {
  const employeeMap = new Map();
  const dates = [];
  const detailRows = [];

  for (const row of rows) {
    if (!employeeMap.has(row.nik)) {
      employeeMap.set(row.nik, {
        nik: row.nik,
        name: row.name,
        department: row.department,
        attendanceByDate: new Map()
      });
    }

    const employee = employeeMap.get(row.nik);
    employee.attendanceByDate.set(row.date, row);
    detailRows.push(row);

    if (!dates.includes(row.date)) {
      dates.push(row.date);
    }
  }

  dates.sort();
  const employees = [...employeeMap.values()].sort((left, right) => {
    if (left.name === right.name) {
      return String(left.nik).localeCompare(String(right.nik));
    }
    return left.name.localeCompare(right.name);
  });

  const columns = [
    { width: 80 },
    { width: 180 },
    { width: 120 },
    ...dates.map(() => ({ width: 70 }))
  ];

  const rowsXml = [
    `<Row>
      <Cell ss:StyleID="header"><Data ss:Type="String">NIK</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Nama</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Departemen</Data></Cell>
      ${dates
        .map((date) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(dayjs(date).format("DD/MM"))}</Data></Cell>`)
        .join("")}
    </Row>`,
    ...employees.map((employee) => {
      const cells = [
        `<Cell><Data ss:Type="String">${escapeXml(employee.nik)}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${escapeXml(employee.name)}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${escapeXml(employee.department || "-")}</Data></Cell>`,
        ...dates.map((date) => {
          const row = employee.attendanceByDate.get(date);
          const text = formatReportCell(row) || "";
          const styleId =
            row?.status === "alpha"
              ? "alpha"
              : row?.status === "leave"
                ? "leave"
                : row?.status === "late" || (Number(row?.lateMinutes) > 0 && row?.status !== "leave")
                  ? "late"
                  : "default";
          return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;
        })
      ];
      return `<Row>${cells.join("")}</Row>`;
    })
  ].join("");

  const columnsXml = columns
    .map((column) => `<Column ss:AutoFitWidth="1" ss:Width="${column.width}" />`)
    .join("");

  const detailRowsXml = [
    `<Row>
      <Cell ss:StyleID="header"><Data ss:Type="String">NIK</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Nama</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Departemen</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Tanggal</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Masuk Pukul (WIB UTC+7)</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Pulang Pukul (WIB UTC+7)</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Telat (Menit)</Data></Cell>
      <Cell ss:StyleID="header"><Data ss:Type="String">Status</Data></Cell>
    </Row>`,
    ...detailRows.map((row) => {
      const statusLabel = formatReportCell(row) || String(row.status || "").replaceAll("_", " ").toUpperCase();
      const statusStyle =
        row.status === "alpha"
          ? "alpha"
          : row.status === "leave"
            ? "leave"
            : row.status === "late" || Number(row.lateMinutes) > 0
              ? "late"
              : "default";
      const checkInCell = row.checkInTimeRaw
        ? `<Cell ss:StyleID="time-text"><Data ss:Type="String">${escapeXml(formatWibLabel(row.checkInTimeRaw))}</Data></Cell>`
        : `<Cell ss:StyleID="default"><Data ss:Type="String"></Data></Cell>`;
      const checkOutCell = row.checkOutTimeRaw
        ? `<Cell ss:StyleID="time-text"><Data ss:Type="String">${escapeXml(formatWibLabel(row.checkOutTimeRaw))}</Data></Cell>`
        : `<Cell ss:StyleID="default"><Data ss:Type="String"></Data></Cell>`;
      return `<Row>
        <Cell ss:StyleID="default"><Data ss:Type="String">${escapeXml(row.nik)}</Data></Cell>
        <Cell ss:StyleID="default"><Data ss:Type="String">${escapeXml(row.name)}</Data></Cell>
        <Cell ss:StyleID="default"><Data ss:Type="String">${escapeXml(row.department || "-")}</Data></Cell>
        <Cell ss:StyleID="default"><Data ss:Type="String">${escapeXml(dayjs(row.date).format("DD/MM/YYYY"))}</Data></Cell>
        ${checkInCell}
        ${checkOutCell}
        <Cell ss:StyleID="default"><Data ss:Type="Number">${Number(row.lateMinutes) || 0}</Data></Cell>
        <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escapeXml(statusLabel)}</Data></Cell>
      </Row>`;
    })
  ].join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Color="#111827" />
      <Interior ss:Color="#E5E7EB" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
    <Style ss:ID="default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Arial" ss:Size="10" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
    <Style ss:ID="alpha">
      <Alignment ss:Vertical="Center" />
      <Font ss:Bold="1" ss:Color="#842029" ss:FontName="Arial" ss:Size="10" />
      <Interior ss:Color="#F8D7DA" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
    <Style ss:ID="leave">
      <Alignment ss:Vertical="Center" />
      <Font ss:Bold="1" ss:Color="#0F5132" ss:FontName="Arial" ss:Size="10" />
      <Interior ss:Color="#D1E7DD" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
    <Style ss:ID="late">
      <Alignment ss:Vertical="Center" />
      <Font ss:Bold="1" ss:Color="#8A4B00" ss:FontName="Arial" ss:Size="10" />
      <Interior ss:Color="#FFE5B4" ss:Pattern="Solid" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
    <Style ss:ID="time-text">
      <Alignment ss:Vertical="Center" />
      <Font ss:FontName="Arial" ss:Size="10" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB" />
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="Attendance">
    <Table>${columnsXml}${rowsXml}</Table>
  </Worksheet>
  <Worksheet ss:Name="Detail">
    <Table>${detailRowsXml}</Table>
  </Worksheet>
</Workbook>`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function createDynamicQrToken(offset = 0) {
  const bucket = Math.floor(dayjs().valueOf() / 30000) + offset;
  const message = `dynamic:${bucket}`;
  const signature = crypto.createHmac("sha256", getQrSecret()).update(message).digest("base64url");
  return `IGENIO:${bucket}:${signature}`;
}

function verifyDynamicQrToken(payload) {
  const parts = String(payload).split(":");
  if (parts.length !== 3 || parts[0] !== "IGENIO") {
    return false;
  }

  const bucket = Number(parts[1]);
  if (!Number.isInteger(bucket)) {
    return false;
  }

  const signature = parts[2];
  const currentBucket = Math.floor(dayjs().valueOf() / 30000);
  const allowedBuckets = [currentBucket, currentBucket - 1];

  return allowedBuckets.some((candidate) => {
    const expected = crypto.createHmac("sha256", getQrSecret()).update(`dynamic:${candidate}`).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return candidate === bucket && actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
}

function verifyQrToken(payload, settings) {
  if (!settings) return false;

  if (settings.type === "static") {
    return payload === settings.staticValue;
  }

  return verifyDynamicQrToken(payload);
}


function deriveStatus(workSchedule, timestamp, isCheckOut = false) {
  const now = dayjs(timestamp);
  let shift;

  if (!workSchedule) return "present";

  if (workSchedule.type === "single") {
    shift = workSchedule.singleShift;
  } else {
    // Multi-shift: find shift where current time is closest to start/end
    const shifts = workSchedule.shifts || [];
    if (shifts.length === 0) return "present"; 

    // Find the shift that is currently active or closest
    shift = shifts.find(s => {
      const start = dayjs(`${now.format("YYYY-MM-DD")}T${s.startTime}:00`);
      const end = dayjs(`${now.format("YYYY-MM-DD")}T${s.endTime}:00`);
      return now.isAfter(start.subtract(2, 'hour')) && now.isBefore(end.add(2, 'hour'));
    }) || shifts[0];
  }

  if (!shift || !shift.startTime || !shift.endTime) {
    return isCheckOut ? "checked_out" : "present";
  }

  const target = dayjs(`${now.format("YYYY-MM-DD")}T${isCheckOut ? shift.endTime : shift.startTime}:00`);
  const tolerance = (isCheckOut ? shift.earlyLeaveToleranceMinutes : shift.lateToleranceMinutes) || 0;
  const diff = isCheckOut ? target.diff(now, "minute") : now.diff(target, "minute");

  if (!isCheckOut && diff > (workSchedule.cutoffMinutes || 240)) {
    return "alpha";
  }
  if (diff > tolerance) {
    return isCheckOut ? "early_leave" : "late";
  }
  return isCheckOut ? "checked_out" : "present";
}


async function verifyAttendancePreconditions(payload, gpsSettings, qrSettings) {
  if (gpsSettings && gpsSettings.latitude !== undefined) {
    const distance = calculateDistance(payload.lat, payload.lng, gpsSettings.latitude, gpsSettings.longitude);
    if (distance > (gpsSettings.radiusMeters || 100)) {
      throw new Error(`Anda berada di luar radius kantor (${Math.round(distance)}m). Jarak maksimal: ${gpsSettings.radiusMeters}m.`);
    }
  }

  if (qrSettings && qrSettings.type) {
    if (!verifyQrToken(payload.qrToken || payload.method, qrSettings)) {
      throw new Error("Token QR tidak valid atau sudah kadaluarsa.");
    }
  }
}



export async function submitAttendance(userId, payload) {
  const settings = await getSettingsBundle();
  const workSchedule = settings.workSchedule || { type: "single", singleShift: { startTime: "08:00", endTime: "17:00" } };
  const gpsSettings = settings.gps;
  const qrSettings = settings.qr;

  // Enforce mandatory verifications
  await verifyAttendancePreconditions(payload, gpsSettings, qrSettings);


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
        workSchedule.type === "single" ? workSchedule.singleShift.name : "Multi-Shift",
        payload.note || "Check-in"
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
    [payload.timestamp, status, payload.note || "Check-out", record.id]
  );
  return updateResult.rows[0];
}
