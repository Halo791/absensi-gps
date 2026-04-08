import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

function statusTone(status) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export function RequestPage({ type }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const endpoint = type === "leave" ? "/admin/leave-requests" : "/admin/overtime-requests";
  const title = type === "leave" ? "Persetujuan Izin / Sakit" : "Persetujuan Lembur";

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await api.get(endpoint);
      setRows(data);
    } catch (loadError) {
      setError(loadError.message || "Gagal memuat data permintaan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  async function update(id, status) {
    try {
      setSubmittingId(id);
      setMessage("");
      setError("");
      await api.patch(`${endpoint}/${id}`, { status });
      setMessage(`Permintaan berhasil di-${status === "approved" ? "setujui" : "tolak"}.`);
      await load();
    } catch (updateError) {
      setError(updateError.message || "Gagal memperbarui status permintaan.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <SectionCard title={title} description="Admin dapat menyetujui atau menolak permintaan dari karyawan.">
      {message ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Memuat daftar permintaan...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Belum ada permintaan pada menu ini.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const isDone = row.status !== "pending";
            return (
              <div key={row.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <span className="text-sm text-slate-400">•</span>
                      <p className="text-sm text-slate-500">{row.nik}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(row.status)}`}>{row.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {type === "leave"
                        ? `${row.type} • ${row.startDate} s/d ${row.endDate}`
                        : `${row.date} • ${row.startTime}-${row.endTime}`}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{row.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isDone || submittingId === row.id}
                      onClick={() => update(row.id, "approved")}
                      className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      disabled={isDone || submittingId === row.id}
                      onClick={() => update(row.id, "rejected")}
                      className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
