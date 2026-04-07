import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { api } from "../lib/api";

export function AdminDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then(setData);
  }, []);

  if (!data) {
    return <div className="rounded-3xl bg-white p-6 shadow-panel">Memuat statistik kehadiran...</div>;
  }

  const chartData = data.monthlyTrend.map((item) => ({
    date: item.date.slice(8),
    label:
      item.status === "late"
        ? "Terlambat"
        : item.status === "present" || item.status === "checked_in"
          ? "Hadir"
          : "Lainnya",
    value: item.status === "late" ? 60 : item.status === "present" || item.status === "checked_in" ? 100 : 35
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Karyawan Aktif" value={data.totals.employees} helper="Digunakan untuk kalkulasi alpha." tone="blue" />
        <StatCard label="Hadir Hari Ini" value={data.totals.present} helper="Sudah check-in atau complete." tone="green" />
        <StatCard label="Terlambat" value={data.totals.late} helper="Melewati toleransi masuk." tone="orange" />
        <StatCard label="Belum Hadir / Alpha" value={data.totals.absent} helper="Belum tercatat hadir hari ini." tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Grafik Kehadiran Bulan Ini" description="Visual sederhana untuk present, late, atau status lain.">
          <div className="space-y-4">
            {chartData.length ? (
              chartData.map((item) => (
                <div key={`${item.date}-${item.label}`} className="grid gap-2 md:grid-cols-[56px_1fr_90px] md:items-center">
                  <span className="text-sm font-medium text-slate-500">#{item.date}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        item.label === "Hadir"
                          ? "bg-emerald-500"
                          : item.label === "Terlambat"
                            ? "bg-orange-400"
                            : "bg-slate-400"
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">{item.label}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Belum ada data kehadiran bulan ini.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Ringkasan Persetujuan" description="Permintaan yang menunggu aksi admin.">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Izin / Sakit Pending</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{data.totals.pendingLeave}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Lembur Pending</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{data.totals.pendingOvertime}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
              Data dashboard diperbarui dari database lokal demo dan langsung mengikuti perubahan setting aktif.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
