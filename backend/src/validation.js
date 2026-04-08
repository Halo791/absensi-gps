import { AppError } from "./errors.js";

function ensureObject(value, message = "Payload tidak valid.") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(message, 400);
  }
  return value;
}

function ensureString(value, field, { min = 1, max = 255, optional = false } = {}) {
  if (value == null || value === "") {
    if (optional) return null;
    throw new AppError(`${field} wajib diisi.`, 400);
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} harus berupa teks.`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new AppError(`${field} minimal ${min} karakter.`, 400);
  }
  if (trimmed.length > max) {
    throw new AppError(`${field} maksimal ${max} karakter.`, 400);
  }
  return trimmed;
}

function ensureBoolean(value, field, { optional = false } = {}) {
  if (value == null) {
    if (optional) return null;
    throw new AppError(`${field} wajib diisi.`, 400);
  }
  if (typeof value !== "boolean") {
    throw new AppError(`${field} harus berupa true/false.`, 400);
  }
  return value;
}

function ensureNumber(value, field, { min = null, max = null, optional = false } = {}) {
  if (value == null || value === "") {
    if (optional) return null;
    throw new AppError(`${field} wajib diisi.`, 400);
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`${field} harus berupa angka.`, 400);
  }
  if (min != null && value < min) {
    throw new AppError(`${field} minimal ${min}.`, 400);
  }
  if (max != null && value > max) {
    throw new AppError(`${field} maksimal ${max}.`, 400);
  }
  return value;
}

function ensureArray(value, field) {
  if (!Array.isArray(value)) {
    throw new AppError(`${field} harus berupa array.`, 400);
  }
  return value;
}

function ensureEnum(value, field, allowedValues) {
  const normalized = ensureString(value, field);
  if (!allowedValues.includes(normalized)) {
    throw new AppError(`${field} tidak valid.`, 400);
  }
  return normalized;
}

function ensureIsoDate(value, field) {
  const normalized = ensureString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AppError(`${field} harus berformat YYYY-MM-DD.`, 400);
  }
  return normalized;
}

function ensureTime(value, field) {
  const normalized = ensureString(value, field);
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new AppError(`${field} harus berformat HH:MM.`, 400);
  }
  return normalized;
}

function ensureIsoTimestamp(value, field) {
  const normalized = ensureString(value, field);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new AppError(`${field} harus berupa timestamp ISO yang valid.`, 400);
  }
  return normalized;
}

function ensureStringArray(value, field) {
  return ensureArray(value, field).map((item, index) => ensureString(item, `${field}[${index}]`, { min: 1, max: 50 }));
}

function sanitizeShift(shift, index) {
  const payload = ensureObject(shift, `Shift #${index + 1} tidak valid.`);
  return {
    name: ensureString(payload.name, `Nama shift #${index + 1}`, { max: 100 }),
    startTime: ensureTime(payload.startTime, `Jam masuk shift #${index + 1}`),
    endTime: ensureTime(payload.endTime, `Jam pulang shift #${index + 1}`),
    lateToleranceMinutes: ensureNumber(payload.lateToleranceMinutes, `Toleransi terlambat shift #${index + 1}`, { min: 0, max: 480 }),
    earlyLeaveToleranceMinutes: ensureNumber(
      payload.earlyLeaveToleranceMinutes,
      `Toleransi pulang awal shift #${index + 1}`,
      { min: 0, max: 480 }
    ),
    isActive: payload.isActive == null ? true : ensureBoolean(payload.isActive, `Status aktif shift #${index + 1}`)
  };
}

export function validateLoginPayload(payload) {
  const data = ensureObject(payload);
  return {
    nik: ensureString(data.nik, "NIK", { min: 3, max: 50 }),
    password: ensureString(data.password, "Password", { min: 6, max: 100 })
  };
}

export function validateEmployeePayload(payload, { partial = false } = {}) {
  const data = ensureObject(payload);
  return {
    nik: ensureString(data.nik, "NIK", { min: 3, max: 50, optional: partial }),
    name: ensureString(data.name, "Nama", { min: 3, max: 120, optional: partial }),
    department: ensureString(data.department, "Departemen", { min: 2, max: 120, optional: partial }),
    position: ensureString(data.position, "Jabatan", { min: 2, max: 120, optional: partial }),
    password: ensureString(data.password, "Password", { min: 8, max: 100, optional: partial }),
    isActive: ensureBoolean(data.isActive, "Status aktif", { optional: partial })
  };
}

export function validatePasswordResetPayload(payload) {
  const data = ensureObject(payload);
  return {
    password: ensureString(data.password, "Password baru", { min: 8, max: 100 })
  };
}

export function validateGeneralSettingsPayload(payload) {
  const data = ensureObject(payload);
  return {
    companyName: ensureString(data.companyName, "Nama perusahaan", { min: 3, max: 160 }),
    timezone: ensureString(data.timezone, "Timezone", { min: 2, max: 50 }),
    backendUrl: ensureString(data.backendUrl, "Backend URL", { min: 3, max: 255 })
  };
}

export function validateWorkSettingsPayload(payload) {
  const data = ensureObject(payload);
  const type = ensureEnum(data.type, "Tipe jadwal", ["single", "multi"]);
  const result = {
    type,
    cutoffMinutes: ensureNumber(data.cutoffMinutes, "Cutoff alpha", { min: 0, max: 1440 }),
    workDays: ensureStringArray(data.workDays, "Hari kerja"),
    holidays: ensureArray(data.holidays, "Hari libur").map((item, index) => ensureIsoDate(item, `Hari libur #${index + 1}`))
  };

  if (type === "single") {
    result.singleShift = sanitizeShift(data.singleShift, 0);
    result.shifts = [];
    return result;
  }

  const shifts = ensureArray(data.shifts, "Shift");
  if (!shifts.length) {
    throw new AppError("Mode multi-shift wajib memiliki minimal satu shift.", 400);
  }
  result.singleShift = null;
  result.shifts = shifts.map(sanitizeShift);
  return result;
}

export function validateGpsSettingsPayload(payload) {
  const data = ensureObject(payload);
  return {
    latitude: ensureNumber(data.latitude, "Latitude", { min: -90, max: 90 }),
    longitude: ensureNumber(data.longitude, "Longitude", { min: -180, max: 180 }),
    radiusMeters: ensureNumber(data.radiusMeters, "Radius GPS", { min: 1, max: 5000 }),
    mockLocationDetection: ensureBoolean(data.mockLocationDetection, "Mock location detection")
  };
}

export function validateQrSettingsPayload(payload) {
  const data = ensureObject(payload);
  return {
    type: ensureEnum(data.type, "Mode QR", ["static", "dynamic"]),
    staticValue: ensureString(data.staticValue, "Nilai QR statis", { min: 4, max: 120 }),
    rotation: ensureEnum(data.rotation, "Rotasi QR", ["30_seconds"])
  };
}

export function validateSecuritySettingsPayload(payload) {
  const data = ensureObject(payload);
  return {
    attendanceValidationWindowSeconds: ensureNumber(data.attendanceValidationWindowSeconds, "Window validasi", { min: 10, max: 600 }),
    requireSelfie: ensureBoolean(data.requireSelfie, "Require selfie"),
    minimumAndroidVersion: ensureString(data.minimumAndroidVersion, "Minimum Android", { min: 1, max: 20 }),
    minimumIosVersion: ensureString(data.minimumIosVersion, "Minimum iOS", { min: 1, max: 20 })
  };
}

export function validateStatusPayload(payload) {
  const data = ensureObject(payload);
  return {
    status: ensureEnum(data.status, "Status", ["pending", "approved", "rejected"])
  };
}

export function validateAttendancePayload(payload) {
  const data = ensureObject(payload);
  return {
    timestamp: ensureIsoTimestamp(data.timestamp, "Timestamp absensi"),
    lat: ensureNumber(data.lat, "Latitude", { min: -90, max: 90 }),
    lng: ensureNumber(data.lng, "Longitude", { min: -180, max: 180 }),
    qrToken: ensureString(data.qrToken, "Token QR", { min: 4, max: 160 }),
    method: ensureEnum(data.method, "Metode absensi", ["qr_static", "qr_dynamic", "gps_qr"]),
    note: ensureString(data.note, "Catatan", { min: 2, max: 160, optional: true }) || "Absensi perangkat"
  };
}

export function validateLeaveRequestPayload(payload) {
  const data = ensureObject(payload);
  return {
    type: ensureEnum(data.type, "Tipe izin", ["leave", "sick"]),
    startDate: ensureIsoDate(data.startDate, "Tanggal mulai"),
    endDate: ensureIsoDate(data.endDate, "Tanggal selesai"),
    reason: ensureString(data.reason, "Alasan", { min: 5, max: 500 })
  };
}

export function validateOvertimeRequestPayload(payload) {
  const data = ensureObject(payload);
  return {
    date: ensureIsoDate(data.date, "Tanggal lembur"),
    startTime: ensureTime(data.startTime, "Jam mulai lembur"),
    endTime: ensureTime(data.endTime, "Jam selesai lembur"),
    reason: ensureString(data.reason, "Alasan lembur", { min: 5, max: 500 })
  };
}
