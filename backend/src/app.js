import cors from "cors";
import express from "express";
import { requireAuth, requireRole, signToken } from "./auth.js";
import { DEMO_ADMIN, DEMO_EMPLOYEE, DEMO_NOTICE } from "./constants.js";
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
import { resetDemoData } from "./seed.js";

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((item) => item.trim())
  : null;

app.use(
  cors({
    origin: allowedOrigins?.length ? allowedOrigins : true
  })
);
app.use(express.json());

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function issueSession(user) {
  const profile = await getUserById(user.id);
  return {
    token: signToken(user),
    user: profile,
    demoNotice: DEMO_NOTICE
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: "demo", database: "postgres", runtime: "netlify-function-ready" });
});

app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    message: "API attendance demo aktif.",
    endpoints: {
      health: "/api/health",
      demoAdmin: "/api/auth/demo/admin",
      demoEmployee: "/api/auth/demo/employee"
    }
  });
});

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { nik, password } = req.body;
    const user = await getUserByNik(nik);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: "NIK atau password salah." });
    }
    return res.json(await issueSession(user));
  })
);

app.post(
  "/api/auth/demo/admin",
  asyncRoute(async (_req, res) => {
    await resetDemoData();
    const user = await getUserByNik(DEMO_ADMIN.nik);
    return res.json(await issueSession(user));
  })
);

app.post(
  "/api/auth/demo/employee",
  asyncRoute(async (_req, res) => {
    await resetDemoData();
    const user = await getUserByNik(DEMO_EMPLOYEE.nik);
    return res.json(await issueSession(user));
  })
);

app.post(
  "/api/demo/reset",
  asyncRoute(async (_req, res) => {
    await resetDemoData();
    return res.json({ message: "Data demo berhasil di-reset." });
  })
);

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
    res.json(await saveSetting("general", req.body));
  })
);

app.put(
  "/api/admin/settings/work",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const value = await saveSetting("workSchedule", req.body);
    if (req.body.type === "multi" && Array.isArray(req.body.shifts)) {
      await replaceShifts(req.body.shifts);
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
    res.json(await saveSetting("gps", req.body));
  })
);

app.put(
  "/api/admin/settings/qr",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await saveSetting("qr", req.body));
  })
);

app.put(
  "/api/admin/settings/security",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await saveSetting("security", req.body));
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
    res.status(201).json(await createEmployee(req.body));
  })
);

app.put(
  "/api/admin/employees/:id",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    res.json(await updateEmployee(Number(req.params.id), req.body));
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
    await resetEmployeePassword(Number(req.params.id), req.body.password);
    res.json({ message: "Password berhasil di-reset." });
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

app.get(
  "/api/admin/attendance/export.csv",
  requireAuth,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    const rows = await listAttendance(req.query);
    const header = "Tanggal,NIK,Nama,Departemen,Status,Check In,Check Out,Metode";
    const csv = [
      header,
      ...rows.map((row) =>
        [
          row.date,
          row.nik,
          row.name,
          row.department,
          row.status,
          row.checkInTime || "",
          row.checkOutTime || "",
          row.method
        ].join(",")
      )
    ].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance-demo.csv");
    res.send(csv);
  })
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
    await updateLeaveStatus(Number(req.params.id), req.body.status);
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
    await updateOvertimeStatus(Number(req.params.id), req.body.status);
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
      qr: await getCurrentQrPayload(),
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
    res.status(201).json(await submitAttendance(req.auth.sub, req.body));
  })
);

app.post(
  "/api/employee/leave-requests",
  requireAuth,
  requireRole("employee"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await createLeaveRequest(req.auth.sub, req.body));
  })
);

app.post(
  "/api/employee/overtime-requests",
  requireAuth,
  requireRole("employee"),
  asyncRoute(async (req, res) => {
    res.status(201).json(await createOvertimeRequest(req.auth.sub, req.body));
  })
);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.message && (error.message.includes("radius") || error.message.includes("QR")) ? 400 : 500;
  res.status(status).json({ message: error.message || "Terjadi kesalahan pada server." });
});


export { app };
