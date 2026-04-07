import { Bell, BriefcaseBusiness, Building2, Clock3, FileClock, LayoutDashboard, LogOut, MapPinned, QrCode, Settings2, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getDemoNotice, getStoredUser } from "../lib/session";

const menu = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/work-settings", label: "Pengaturan Jam Kerja", icon: Clock3 },
  { to: "/admin/location-settings", label: "Lokasi & GPS", icon: MapPinned },
  { to: "/admin/qr-settings", label: "QR Code", icon: QrCode },
  { to: "/admin/security-settings", label: "Keamanan", icon: ShieldCheck },
  { to: "/admin/employees", label: "Manajemen Karyawan", icon: Users },
  { to: "/admin/attendance", label: "Riwayat & Laporan", icon: FileClock },
  { to: "/admin/leave-requests", label: "Izin / Sakit", icon: BriefcaseBusiness },
  { to: "/admin/overtime-requests", label: "Lembur", icon: Bell },
  { to: "/admin/general-settings", label: "Pengaturan Umum", icon: Settings2 }
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full rounded-[2rem] bg-slate-950 p-6 text-white shadow-panel lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-80">
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.32em] text-blue-200">Admin Panel</p>
            <h1 className="mt-3 text-2xl font-semibold">Demo Absensi HRD</h1>
            <p className="mt-2 text-sm text-slate-300">
              {user?.name} • {user?.department}
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            {getDemoNotice()}
          </div>

          <nav className="mt-6 space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                      isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => {
                clearSession();
                navigate("/");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <LogOut size={18} />
              Logout Demo
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 rounded-[2rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-orange-400 p-8 text-white shadow-panel">
            <div className="flex items-center gap-3 text-sm font-medium text-blue-50">
              <Building2 size={18} />
              Sidebar konfigurasi lengkap untuk HRD
            </div>
            <p className="mt-3 max-w-3xl text-3xl font-semibold leading-tight">
              Semua pengaturan demo tersimpan langsung ke database lokal dan segera dipakai untuk validasi absen.
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
