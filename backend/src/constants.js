export const DEMO_ADMIN = {
  nik: "ADM001",
  name: "Demo HRD",
  department: "Human Resources",
  position: "HR Manager",
  password: "demo123",
  role: "admin"
};

export const DEMO_EMPLOYEE = {
  nik: "EMP001",
  name: "Demo Karyawan",
  department: "Operasional",
  position: "Staff Operasional",
  password: "karyawan123",
  role: "employee"
};

export const DEFAULT_SETTINGS = {
  companyName: "PT Demo Absensi Indonesia",
  timezone: "WIB",
  backendUrl: "http://localhost:4000",
  workSchedule: {
    type: "single",
    cutoffMinutes: 60,
    holidays: ["2026-04-10"],
    workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    singleShift: {
      name: "Shift Reguler",
      startTime: "08:00",
      endTime: "17:00",
      lateToleranceMinutes: 15,
      earlyLeaveToleranceMinutes: 15
    }
  },
  gps: {
    latitude: -6.200000,
    longitude: 106.816666,
    radiusMeters: 120,
    mockLocationDetection: true
  },
  qr: {
    type: "dynamic",
    staticValue: "DEMO-ABSENSI-STATIC",
    rotation: "30_seconds"
  },
  security: {
    attendanceValidationWindowSeconds: 90,
    requireSelfie: false,
    minimumAndroidVersion: "10",
    minimumIosVersion: "15"
  }
};

export const DEMO_NOTICE =
  "Demo mode aktif. Perubahan data hanya sementara dan bisa di-reset kapan saja.";
