import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

export function RequestPage({ type }) {
  const [rows, setRows] = useState([]);
  const endpoint = type === "leave" ? "/admin/leave-requests" : "/admin/overtime-requests";
  const title = type === "leave" ? "Persetujuan Izin / Sakit" : "Persetujuan Lembur";

  function load() {
    api.get(endpoint).then(setRows);
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  async function update(id, status) {
    await api.patch(`${endpoint}/${id}`, { status });
    load();
  }

  return (
    <SectionCard title={title} description="Admin dapat menyetujui atau menolak permintaan dari karyawan.">
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-3xl border border-slate-200 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {type === "leave"
                    ? `${row.type} • ${row.startDate} s/d ${row.endDate}`
                    : `${row.date} • ${row.startTime}-${row.endTime}`}
                </p>
                <p className="mt-1 text-sm text-slate-500">{row.reason}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => update(row.id, "approved")} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white">
                  Setujui
                </button>
                <button type="button" onClick={() => update(row.id, "rejected")} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-medium text-white">
                  Tolak
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
