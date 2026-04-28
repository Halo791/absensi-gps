import { useEffect, useRef, useState } from "react";
import { clearSession } from "../lib/session";
import { api } from "../lib/api";

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

export function EmployeePage() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraMode, setCameraMode] = useState("user");
  const [leaveForm, setLeaveForm] = useState({
    type: "leave",
    startDate: formatDateInput(new Date()),
    endDate: formatDateInput(new Date()),
    reason: ""
  });
  const [overtimeForm, setOvertimeForm] = useState({
    date: formatDateInput(new Date()),
    startTime: "18:00",
    endTime: "20:00",
    reason: ""
  });
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  function load() {
    api.get("/employee/dashboard").then((payload) => {
      setData(payload);
      setScanStatus("");
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    async function startCamera() {
      if (!cameraActive) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      try {
        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraMode
          },
          audio: false
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        setCameraError("Kamera tidak bisa diakses. Pastikan izin kamera diaktifkan.");
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraActive, cameraMode]);

  async function handleAttendance() {
    setMessage("");
    setScanStatus("");
    if (!navigator.geolocation) {
      setMessage("Geolocation tidak didukung oleh browser Anda.");
      return;
    }

    if (!cameraActive) {
      setCameraActive(true);
      setMessage("Kamera diaktifkan. Arahkan ke QR aktif, lalu klik lagi Scan QR & Absen.");
      return;
    }

    if (!window.BarcodeDetector) {
      setMessage("Browser Anda belum mendukung scan QR otomatis. Gunakan browser Chromium terbaru.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          if (!videoRef.current) {
            throw new Error("Kamera belum siap. Coba tunggu sebentar lalu scan ulang.");
          }

          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          let scannedValue = "";
          for (let attempt = 0; attempt < 24; attempt += 1) {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) {
              scannedValue = codes[0].rawValue || "";
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 125));
          }

          if (!scannedValue) {
            throw new Error("QR tidak terdeteksi. Arahkan kamera ke QR aktif terlebih dahulu.");
          }
          if (scannedValue !== data.qr.value) {
            throw new Error("QR yang dipindai tidak cocok dengan QR aktif.");
          }

          setQrConfirmed(true);
          setScanStatus("QR berhasil dipindai.");
          const response = await api.post("/employee/attendance", {
            timestamp: new Date().toISOString(),
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            qrToken: scannedValue,
            method: data.qr.mode === "dynamic" ? "qr_dynamic" : "qr_static",
            note: "Absensi perangkat"
          });
          setMessage(`Absensi berhasil! Status: ${response.status}`);
          load();
        } catch (error) {
          setMessage(error.message || "Gagal melakukan absensi.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        setMessage("Gagal mendapatkan lokasi. Pastikan izin GPS aktif.");
      },
      { enableHighAccuracy: true }
    );
  }


  async function submitLeave() {
    try {
      setLoading(true);
      await api.post("/employee/leave-requests", leaveForm);
      setMessage("Permintaan izin berhasil dikirim.");
      setLeaveForm((current) => ({ ...current, reason: "" }));
      load();
    } catch (error) {
      setMessage(error.message || "Gagal mengirim permintaan izin.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOvertime() {
    try {
      setLoading(true);
      await api.post("/employee/overtime-requests", overtimeForm);
      setMessage("Permintaan lembur berhasil dikirim.");
      setOvertimeForm((current) => ({ ...current, reason: "" }));
      load();
    } catch (error) {
      setMessage(error.message || "Gagal mengirim permintaan lembur.");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return <div className="p-8">Memuat dashboard karyawan...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-panel">
        <div className="flex items-center gap-4">
          <img
            src="/assets/logo-ingenio-nav.png"
            alt="Logo Ingenio"
            className="h-14 w-14 rounded-2xl border border-[#f4c319]/30 bg-[#f4c319] p-1 object-contain"
          />
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#f4c319]">Ingenio Absensi</p>
            <p className="text-sm text-[#ffe9a3]">Portal Karyawan</p>
          </div>
        </div>
        <h1 className="mt-3 text-4xl font-semibold">{data.profile.name}</h1>
        <p className="mt-2 text-slate-300">{data.profile.department}</p>
        <div className="mt-5 rounded-3xl bg-white/10 p-4 text-sm text-blue-100">
          Absensi tersambung ke GPS, QR, dan validasi server.
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold text-slate-900">Absen Hari Ini</h2>
          <p className="mt-2 text-sm text-slate-500">
            Scan QR aktif + GPS. QR diperbarui otomatis sesuai jadwal.
          </p>
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
                {data.qr.image ? (
                  <img src={data.qr.image} alt="QR aktif" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-center text-xs text-slate-400">QR image tidak tersedia</div>
                )}
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-900">Langkah scan</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Aktifkan kamera di panel kanan.</li>
                  <li>Arahkan kamera ke QR aktif di layar ini atau perangkat lain.</li>
                  <li>Klik <span className="font-medium">Scan QR & Absen</span> untuk menyimpan data.</li>
                </ol>
                {qrConfirmed ? <p className="mt-3 font-medium text-emerald-700">QR sudah terverifikasi.</p> : null}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={handleAttendance}
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              Scan QR & Absen
            </button>
            <button
              type="button"
              onClick={async () => {
                await api.post("/auth/logout").catch(() => {});
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
          <h2 className="text-xl font-semibold text-slate-900">Mirror Camera QR</h2>
          <p className="mt-2 text-sm text-slate-500">
            Pilih kamera depan atau belakang sesuai kebutuhan. Kamera depan tampil mirror agar lebih mudah diarahkan.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setCameraMode("user")}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                cameraMode === "user" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"
              }`}
            >
              Kamera Depan
            </button>
            <button
              type="button"
              onClick={() => setCameraMode("environment")}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                cameraMode === "environment" ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"
              }`}
            >
              Kamera Belakang
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-[1.5rem] bg-slate-950">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`aspect-[4/3] w-full object-cover ${cameraMode === "user" ? "-scale-x-100" : ""}`}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-slate-300">
                Aktifkan kamera untuk preview QR. Gunakan kamera belakang untuk scan yang lebih natural, atau kamera depan untuk bantuan framing mirror.
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setCameraActive((current) => !current)}
              className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white"
            >
              {cameraActive ? "Matikan Kamera" : "Aktifkan Mirror Camera"}
            </button>
          </div>
          {scanStatus ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{scanStatus}</div> : null}
          {cameraError ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{cameraError}</div> : null}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-slate-900">Aksi HR Umum</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div className="grid gap-5">
            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="font-medium text-slate-900">Ajukan Izin / Sakit</p>
              <div className="mt-3 grid gap-3">
                <select
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  value={leaveForm.type}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, type: event.target.value }))}
                >
                  <option value="leave">Izin</option>
                  <option value="sick">Sakit</option>
                </select>
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  value={leaveForm.startDate}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, startDate: event.target.value }))}
                />
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  value={leaveForm.endDate}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, endDate: event.target.value }))}
                />
                <textarea
                  className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Tuliskan alasan izin atau sakit"
                  value={leaveForm.reason}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={submitLeave}
                  className="rounded-2xl bg-orange-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
                >
                  Kirim Izin / Sakit
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="font-medium text-slate-900">Ajukan Lembur</p>
              <div className="mt-3 grid gap-3">
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  value={overtimeForm.date}
                  onChange={(event) => setOvertimeForm((current) => ({ ...current, date: event.target.value }))}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="time"
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                    value={overtimeForm.startTime}
                    onChange={(event) => setOvertimeForm((current) => ({ ...current, startTime: event.target.value }))}
                  />
                  <input
                    type="time"
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                    value={overtimeForm.endTime}
                    onChange={(event) => setOvertimeForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </div>
                <textarea
                  className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Tuliskan alasan lembur"
                  value={overtimeForm.reason}
                  onChange={(event) => setOvertimeForm((current) => ({ ...current, reason: event.target.value }))}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={submitOvertime}
                  className="rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white disabled:opacity-60"
                >
                  Kirim Lembur
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            Reminder absen, validasi GPS, cutoff alpha, dan selfie wajib dikendalikan dari konfigurasi backend.
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
