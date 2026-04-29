import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

const defaultFilters = {
  status: "",
  department: "",
  name: "",
  startDate: "",
  endDate: ""
};

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function AttendancePage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const departments = useMemo(
    () => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const employeeNames = useMemo(
    () => [...new Set(rows.map((row) => row.name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  async function loadData(activeFilters = filters) {
    try {
      setLoading(true);
      setError("");
      const query = buildQuery(activeFilters);
      const data = await api.get(`/admin/attendance${query}`);
      setRows(data);
    } catch (loadError) {
      setError(loadError.message || "Gagal memuat data absensi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(defaultFilters);
  }, []);

  async function applyFilters() {
    setMessage("");
    await loadData(filters);
  }

  async function exportCsv() {
    try {
      setExporting(true);
      setError("");
      const csv = await api.get(`/admin/attendance/export.csv${buildQuery(filters)}`);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "attendance-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Laporan CSV berhasil diunduh.");
    } catch (exportError) {
      setError(exportError.message || "Gagal mengunduh laporan.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SectionCard
      title="Riwayat Absen & Laporan"
      description="Filter data absensi admin berdasarkan nama pegawai, status, departemen, dan rentang tanggal."
      actions={
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {exporting ? "Mengunduh..." : "Ekspor CSV Delimited"}
        </button>
      }
    >
      {message ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Ekspor laporan sekarang berupa file <span className="font-medium">CSV</span> dengan kolom tanggal, jam masuk,
        jam pulang, telat, dan status. Format jam mengikuti <span className="font-medium">WIB (UTC+7)</span>.
      </div>

      <div className="mb-5 grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-6">
        <select
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="">Semua Status</option>
          <option value="present">Present</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="late">Late</option>
          <option value="early_leave">Early Leave</option>
          <option value="alpha">Alpha</option>
          <option value="leave">Leave</option>
        </select>
        <select
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={filters.department}
          onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}
        >
          <option value="">Semua Departemen</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={filters.name}
          onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))}
          list="employee-name-options"
          placeholder="Nama pegawai"
        />
        <datalist id="employee-name-options">
          {employeeNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <input
          type="date"
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={filters.startDate}
          onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
        />
        <input
          type="date"
          className="rounded-2xl border border-slate-200 px-4 py-3"
          value={filters.endDate}
          onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
          >
            Terapkan
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(defaultFilters);
              loadData(defaultFilters);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Memuat data absensi...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Belum ada data absensi untuk filter ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Tanggal</th>
                <th className="pb-3">Nama</th>
                <th className="pb-3">NIK</th>
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
                  <td className="py-3">{row.nik}</td>
                  <td className="py-3">{row.department}</td>
                  <td className="py-3 capitalize">{row.status.replaceAll("_", " ")}</td>
                  <td className="py-3">{row.checkInTime || "-"}</td>
                  <td className="py-3">{row.checkOutTime || "-"}</td>
                  <td className="py-3">{row.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
