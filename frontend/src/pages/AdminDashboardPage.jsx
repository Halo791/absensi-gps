import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    value: item.status === "late" ? 2 : item.status === "present" || item.status === "checked_in" ? 3 : 1
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
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
