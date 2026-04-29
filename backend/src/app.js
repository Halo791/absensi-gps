import crypto from "crypto";
import cors from "cors";
import express from "express";
import { allowedOrigins, getSessionCookieOptions, isProduction, sessionCookieName } from "./config.js";
import { AppError, isAppError } from "./errors.js";
import { requireAuth, requireRole, signToken } from "./auth.js";
import {
  createEmployee,
  createLeaveRequest,
  createOvertimeRequest,
  deleteEmployee,
  getCurrentQrCode,
  getCurrentQrPayload,
  getDashboardSummary,
  getSetting,
  getSettingsBundle,
  getAttendanceReportRows,
  getUserById,
  getUserByNik,
  listAttendance,
  listEmployeeAttendance,
  listEmployees,
  listLeaveRequests,
  listOvertimeRequests,
  listShifts,
  replaceShifts,
  resetEmployeePassword,
  saveSetting,
  submitAttendance,
  updateEmployee,
  updateLeaveStatus,
  updateOvertimeStatus,
  verifyPassword
} from "./repository.js";
import { buildAttendanceWorkbookXlsx } from "./reportWorkbook.js";
import {
  validateAttendancePayload,
  validateEmployeePayload,
  validateGeneralSettingsPayload,
  validateGpsSettingsPayload,
  validateLeaveRequestPayload,
  validateLoginPayload,
  validateOvertimeRequestPayload,
  validatePasswordResetPayload,
  validateQrSettingsPayload,
  validateSecuritySettingsPayload,
  validateStatusPayload,
  validateWorkSettingsPayload
} from "./validation.js";

const app = express();

app.use(
  cors({
    origin: allowedOrigins?.length ? allowedOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self)");
  next();
});

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function issueSession(user) {
  const profile = await getUserById(user.id);
  if (!profile || !profile.is_active) {
    throw new AppError("Akun tidak aktif.", 403);
  }
  return {
    user: profile
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: isProduction ? "production" : "development",
    database: "postgres",
    runtime: "netlify-function-ready"
  });
});

app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    message: "API attendance aktif.",
    endpoints: {
      health: "/api/health",
      login: "/api/auth/login",
      me: "/api/me"
    }
  });
});

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { nik, password } = validateLoginPayload(req.body);
    const user = await getUserByNik(nik);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: "NIK atau password salah." });
    }
    const session = await issueSession(user);
    res.cookie(sessionCookieName, signToken(user), getSessionCookieOptions());
    return res.json(session);
  })
);

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(sessionCookieName, { path: "/" });
  res.status(204).send();
});

app.get(
  "/api/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json({
      user: await getUserById(req.auth.sub),
      settings: await getSettingsBundle()
    });
  })
);

app.get(
  "/api/admin/dashboard",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json(await getDashboardSummary());
  })
);

app.get(
  "/api/admin/settings",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json({
      ...(await getSettingsBundle()),
      shifts: await listShifts()
    });
  })
);

app.put(
  "/api/admin/settings/general",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await saveSetting("general", validateGeneralSettingsPayload(req.body)));
  })
);

app.put(
  "/api/admin/settings/work",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const payload = validateWorkSettingsPayload(req.body);
    const value = await saveSetting("workSchedule", payload);
    if (payload.type === "multi" && Array.isArray(payload.shifts)) {
      await replaceShifts(payload.shifts);
    }
    res.json({
      workSchedule: value,
      shifts: await listShifts()
    });
  })
);

app.put(
  "/api/admin/settings/gps",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await saveSetting("gps", validateGpsSettingsPayload(req.body)));
  })
);

app.put(
  "/api/admin/settings/qr",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await saveSetting("qr", validateQrSettingsPayload(req.body)));
  })
);

app.put(
  "/api/admin/settings/security",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await saveSetting("security", validateSecuritySettingsPayload(req.body)));
  })
);

app.get(
  "/api/admin/qr/current",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json(await getCurrentQrCode());
  })
);

app.get(
  "/api/admin/employees",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json(await listEmployees());
  })
);

app.post(
  "/api/admin/employees",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await createEmployee(validateEmployeePayload(req.body)));
  })
);

app.put(
  "/api/admin/employees/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await updateEmployee(Number(req.params.id), validateEmployeePayload(req.body, { partial: true })));
  })
);

app.delete(
  "/api/admin/employees/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    await deleteEmployee(Number(req.params.id));
    res.json({ message: "Karyawan berhasil dihapus." });
  })
);

app.patch(
  "/api/admin/employees/:id/reset-password",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const payload = req.body && Object.keys(req.body).length ? validatePasswordResetPayload(req.body) : null;
    const password = payload?.password || `Tmp-${crypto.randomBytes(8).toString("base64url")}`;
    await resetEmployeePassword(Number(req.params.id), password);
    res.json({ message: "Password berhasil diperbarui.", password });
  })
);

app.get(
  "/api/admin/attendance",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await listAttendance(req.query));
  })
);

async function sendAttendanceReportXlsx(req, res) {
  const rows = await getAttendanceReportRows(req.query);
  const buffer = buildAttendanceWorkbookXlsx(rows);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=attendance-report.xlsx");
  res.send(buffer);
}

app.get(
  "/api/admin/attendance/export.xlsx",
  requireAuth,
  requireRole("admin"),
  asyncRoute(sendAttendanceReportXlsx)
);

app.get(
  "/api/admin/attendance/export.xls",
  requireAuth,
  requireRole("admin"),
  asyncRoute(sendAttendanceReportXlsx)
);

app.get(
  "/api/admin/leave-requests",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json(await listLeaveRequests());
  })
);

app.patch(
  "/api/admin/leave-requests/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const payload = validateStatusPayload(req.body);
    await updateLeaveStatus(Number(req.params.id), payload.status);
    res.json({ message: "Status izin diperbarui." });
  })
);

app.get(
  "/api/admin/overtime-requests",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    res.json(await listOvertimeRequests());
  })
);

app.patch(
  "/api/admin/overtime-requests/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const payload = validateStatusPayload(req.body);
    await updateOvertimeStatus(Number(req.params.id), payload.status);
    res.json({ message: "Status lembur diperbarui." });
  })
);

app.get(
  "/api/employee/dashboard",
  requireAuth,
  requireRole("employee"),
  asyncRoute(async (req, res) => {
    res.json({
      profile: await getUserById(req.auth.sub),
      attendance: await listEmployeeAttendance(req.auth.sub),
      leaveRequests: await listLeaveRequests(req.auth.sub),
      overtimeRequests: await listOvertimeRequests(req.auth.sub),
      qr: await getCurrentQrCode(),
      settings: {
        workSchedule: await getSetting("workSchedule"),
        gps: await getSetting("gps"),
        security: await getSetting("security")
      }
    });
  })
);

app.post(
  "/api/employee/attendance",
  requireAuth,
  requireRole("employee"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await submitAttendance(req.auth.sub, validateAttendancePayload(req.body)));
  })
);

app.post(
  "/api/employee/leave-requests",
  requireAuth,
  requireRole("employee"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await createLeaveRequest(req.auth.sub, validateLeaveRequestPayload(req.body)));
  })
);

app.post(
  "/api/employee/overtime-requests",
  requireAuth,
  requireRole("employee"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await createOvertimeRequest(req.auth.sub, validateOvertimeRequestPayload(req.body)));
  })
);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (isAppError(error)) {
    return res.status(error.status).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    });
  }
  if (error?.code === "23505") {
    return res.status(409).json({ message: "Data yang sama sudah terdaftar." });
  }
  const status = error.message && (error.message.includes("radius") || error.message.includes("QR")) ? 400 : 500;
  return res.status(status).json({ message: error.message || "Terjadi kesalahan pada server." });
});


export { app };
