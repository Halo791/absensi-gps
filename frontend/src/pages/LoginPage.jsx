import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { saveSession } from "../lib/session";

export function LoginPage() {
  const navigate = useNavigate();
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const session = await api.post("/auth/login", { nik, password });
      saveSession(session);
      navigate(session.user.role === "admin" ? "/admin/dashboard" : "/employee");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loginDemo(type) {
    try {
      setLoading(true);
      const session = await api.post(`/auth/demo/${type}`, {});
      saveSession(session);
      navigate(type === "admin" ? "/admin/dashboard" : "/employee");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] bg-[#17120b] p-10 text-white shadow-panel">
          <div className="flex items-center gap-4">
            <img
              src="/assets/logo-ingenio-nav.png"
              alt="Logo Ingenio"
              className="h-16 w-16 rounded-2xl border border-[#f4c319]/30 bg-[#f4c319] object-cover"
            />
            <div>
              <div className="inline-flex rounded-full bg-[#f4c319]/20 px-4 py-2 text-sm text-[#ffe9a3]">
                Web admin + simulasi mode karyawan
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.32em] text-[#f4c319]">Ingenio Absensi</p>
            </div>
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-tight">
            Ingenio Absensi dengan GPS, QR Code, panel admin, dan alur karyawan yang siap dipakai.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[#f3e7cf]">
            Login demo akan me-reset data statis agar setiap sesi aman untuk testing. Perubahan konfigurasi langsung
            memengaruhi proses absen tanpa restart server.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => loginDemo("admin")}
              className="rounded-3xl bg-[#f4c319] px-6 py-5 text-left text-[#17120b] transition hover:-translate-y-1"
            >
              <p className="text-sm font-medium text-[#8b0000]">Login Demo sebagai Admin</p>
              <p className="mt-2 text-xl font-semibold">Akses penuh sidebar dan semua konfigurasi</p>
              <p className="mt-3 text-sm text-[#5c4500]">NIK {`ADM001`} • password {`demo123`}</p>
            </button>

            <button
              type="button"
              onClick={() => loginDemo("employee")}
              className="rounded-3xl bg-[#d62828] px-6 py-5 text-left text-white transition hover:-translate-y-1"
            >
              <p className="text-sm font-medium text-[#ffe9a3]">Login Demo sebagai Karyawan</p>
              <p className="mt-2 text-xl font-semibold">Check-in, check-out, izin, dan lembur</p>
              <p className="mt-3 text-sm text-[#ffd3d3]">NIK {`EMP001`} • password {`karyawan123`}</p>
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#f4c319]/25 bg-white/90 p-8 shadow-panel backdrop-blur">
          <h2 className="text-2xl font-semibold text-[#17120b]">Masuk ke Ingenio Absensi</h2>
          <p className="mt-2 text-sm text-slate-500">
            Gunakan akun demo di bawah atau login manual dengan kredensial yang sama.
          </p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">NIK</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#d62828]"
                value={nik}
                onChange={(event) => setNik(event.target.value)}
                placeholder="ADM001 atau EMP001"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#d62828]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password demo"
              />
            </label>

            {message ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#17120b] px-4 py-3 font-medium text-[#f4c319] transition hover:bg-[#2a2013] disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
