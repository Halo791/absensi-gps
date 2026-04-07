import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

export function AttendancePage() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/admin/attendance").then(setRows);
  }, []);

  async function exportCsv() {
    const csv = await api.get("/admin/attendance/export.csv");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-demo.csv";
    link.click();
    window.URL.revokeObjectURL(url);
    setMessage("Laporan CSV berhasil diunduh.");
  }

  return (
    <SectionCard
      title="Riwayat Absen & Laporan"
      description="Tampilan tabel dengan filter backend sederhana dan endpoint ekspor CSV."
      actions={
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
        >
          Ekspor CSV
        </button>
      }
    >
      {message ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3">Tanggal</th>
              <th className="pb-3">Nama</th>
              <th className="pb-3">Departemen</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Check In</th>
              <th className="pb-3">Check Out</th>
              <th className="pb-3">Metode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="py-3">{row.date}</td>
                <td className="py-3">{row.name}</td>
                <td className="py-3">{row.department}</td>
                <td className="py-3">{row.status}</td>
                <td className="py-3">{row.checkInTime || "-"}</td>
                <td className="py-3">{row.checkOutTime || "-"}</td>
                <td className="py-3">{row.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
