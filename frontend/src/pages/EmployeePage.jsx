import { useEffect, useState } from "react";
import { clearSession, getDemoNotice } from "../lib/session";
import { api } from "../lib/api";

export function EmployeePage() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");

  function load() {
    api.get("/employee/dashboard").then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAttendance() {
    const now = new Date().toISOString();
    const response = await api.post("/employee/attendance", {
      timestamp: now,
      lat: -6.2,
      lng: 106.8166,
      method: "gps_qr",
      note: "Absen demo"
    });
    setMessage(`Absensi tersimpan dengan status ${response.status}.`);
    load();
  }

  async function submitLeave() {
    await api.post("/employee/leave-requests", {
      type: "leave",
      startDate: "2026-04-12",
      endDate: "2026-04-12",
      reason: "Keperluan keluarga"
    });
    setMessage("Permintaan izin berhasil dikirim.");
    load();
  }

  async function submitOvertime() {
    await api.post("/employee/overtime-requests", {
      date: "2026-04-08",
      startTime: "18:00",
      endTime: "20:00",
      reason: "Closing operasional"
    });
    setMessage("Permintaan lembur berhasil dikirim.");
    load();
  }

  if (!data) {
    return <div className="p-8">Memuat dashboard karyawan...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-blue-200">Mode Karyawan</p>
        <h1 className="mt-3 text-4xl font-semibold">{data.profile.name}</h1>
        <p className="mt-2 text-slate-300">{data.profile.department}</p>
        <div className="mt-5 rounded-3xl bg-white/10 p-4 text-sm text-blue-100">{getDemoNotice()}</div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold text-slate-900">Absen Hari Ini</h2>
          <p className="mt-2 text-sm text-slate-500">
            Simulasi scan QR + GPS. QR aktif: <strong>{data.qr.value}</strong>
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button type="button" onClick={handleAttendance} className="rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white">
              Scan QR & Absen
            </button>
            <button
              type="button"
              onClick={() => {
                clearSession();
                window.location.href = "/";
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700"
            >
              Logout
            </button>
          </div>
          {message ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold text-slate-900">Aksi HR Umum</h2>
          <div className="mt-4 grid gap-3">
            <button type="button" onClick={submitLeave} className="rounded-2xl bg-orange-400 px-4 py-3 font-medium text-slate-950">
              Ajukan Izin / Sakit
            </button>
            <button type="button" onClick={submitOvertime} className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white">
              Ajukan Lembur
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Reminder absen, validasi GPS, cutoff alpha, dan selfie wajib sudah disiapkan sebagai konfigurasi backend demo.
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-slate-900">Riwayat Absen</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Tanggal</th>
                <th className="pb-3">Check In</th>
                <th className="pb-3">Check Out</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Metode</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="py-3">{row.date}</td>
                  <td className="py-3">{row.checkInTime || "-"}</td>
                  <td className="py-3">{row.checkOutTime || "-"}</td>
                  <td className="py-3">{row.status}</td>
                  <td className="py-3">{row.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
