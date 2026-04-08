import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Clock3,
  FileClock,
  LayoutDashboard,
  LogOut,
  MapPinned,
  QrCode,
  Settings2,
  ShieldCheck,
  Users
} from "lucide-react";
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
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full rounded-[2rem] bg-[#17120b] p-6 text-white shadow-panel lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-80">
          <div className="rounded-3xl border border-[#f4c319]/20 bg-white/5 p-5">
            <div className="flex items-center gap-4">
              <img
                src="/assets/logo-ingenio-nav.png"
                alt="Logo Ingenio"
                className="h-14 w-14 rounded-2xl border border-[#f4c319]/30 bg-[#f4c319] p-1 object-contain"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#f4c319]">Admin Panel</p>
                <h1 className="mt-2 text-2xl font-semibold">Ingenio Absensi</h1>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#f3e7cf]">
              {user?.name} • {user?.department}
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-[#d62828]/30 bg-[#d62828]/15 p-4 text-sm text-[#ffe0e0]">
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
                      isActive ? "bg-[#f4c319] text-[#17120b]" : "text-[#f3e7cf] hover:bg-white/10 hover:text-white"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#f4c319]/25 px-4 py-3 text-sm font-medium text-[#f4c319] transition hover:bg-[#f4c319]/10"
            >
              <LogOut size={18} />
              Logout Demo
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 rounded-[2rem] bg-gradient-to-r from-[#17120b] via-[#2b200f] to-[#d62828] p-8 text-white shadow-panel">
            <div className="flex items-center gap-3 text-sm font-medium text-[#ffe9a3]">
              <img
                src="/assets/logo-ingenio-nav.png"
                alt="Logo Ingenio"
                className="h-10 w-10 rounded-xl border border-[#f4c319]/30 bg-[#f4c319] p-1 object-contain"
              />
              <Building2 size={18} />
              Identitas baru Ingenio Absensi
            </div>
            <p className="mt-3 max-w-3xl text-3xl font-semibold leading-tight">
              Semua pengaturan Ingenio Absensi tersimpan langsung ke database aktif dan siap dipakai untuk operasional.
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
