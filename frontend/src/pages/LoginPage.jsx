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
      setMessage("");
      const session = await api.post("/auth/login", { nik, password });
      saveSession(session);
      navigate(session.user.role === "admin" ? "/admin/dashboard" : "/employee");
    } catch (error) {
      setMessage(error.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex flex-col justify-between rounded-[2rem] bg-[#17120b] p-10 text-white shadow-panel">
          <div>
            <div className="flex items-center gap-4">
              <img
                src="/assets/logo-ingenio-nav.png"
                alt="Logo Ingenio"
                className="h-16 w-16 rounded-2xl border border-[#f4c319]/30 bg-[#f4c319] p-1 object-contain"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#f4c319]">Ingenio Absensi</p>
                <h1 className="mt-2 text-3xl font-semibold">Portal Absensi Karyawan</h1>
              </div>
            </div>

            <p className="mt-8 max-w-2xl text-5xl font-semibold leading-tight">
              Login aman untuk absensi, pengaturan jam kerja, GPS, QR, dan pengelolaan karyawan.
            </p>
            <p className="mt-6 max-w-2xl text-lg text-[#f3e7cf]">
              Akses dibatasi untuk akun yang terdaftar. Seluruh aktivitas tersimpan di database aktif dan diproses
              melalui validasi server-side.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-[#ffe9a3]">Autentikasi</p>
              <p className="mt-2 text-lg font-medium">JWT terenkripsi</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-[#ffe9a3]">Absensi</p>
              <p className="mt-2 text-lg font-medium">QR + GPS validasi</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-[#ffe9a3]">Operasional</p>
              <p className="mt-2 text-lg font-medium">Dashboard terpusat</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#f4c319]/25 bg-white/90 p-8 shadow-panel backdrop-blur">
          <h2 className="text-2xl font-semibold text-[#17120b]">Masuk ke Sistem</h2>
          <p className="mt-2 text-sm text-slate-500">Gunakan NIK dan password akun perusahaan Anda.</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">NIK</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#d62828]"
                value={nik}
                onChange={(event) => setNik(event.target.value)}
                placeholder="Masukkan NIK"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#d62828]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
              />
            </label>

            {message ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#17120b] px-4 py-3 font-medium text-[#f4c319] transition hover:bg-[#2a2013] disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
