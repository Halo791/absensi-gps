import { useEffect, useState } from "react";
import { Field } from "../components/Field";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

const defaultShift = {
  name: "",
  startTime: "08:00",
  endTime: "17:00",
  lateToleranceMinutes: 15,
  earlyLeaveToleranceMinutes: 15,
  isActive: true
};

function createShift() {
  return { ...defaultShift };
}

export function WorkSettingsPage() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const settings = await api.get("/admin/settings");
        if (cancelled) return;
        setForm({
          ...settings.workSchedule,
          shifts: settings.shifts?.length ? settings.shifts : [createShift()]
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Gagal memuat pengaturan jam kerja.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSingleShift(field, value) {
    setForm((current) => ({
      ...current,
      singleShift: {
        ...current.singleShift,
        [field]: value
      }
    }));
  }

  function updateShift(index, field, value) {
    setForm((current) => ({
      ...current,
      shifts: current.shifts.map((shift, shiftIndex) =>
        shiftIndex === index ? { ...shift, [field]: value } : shift
      )
    }));
  }

  async function saveChanges() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        ...form,
        shifts: form.type === "multi" ? form.shifts : []
      };
      const response = await api.put("/admin/settings/work", payload);
      setForm((current) => ({
        ...current,
        ...response.workSchedule,
        shifts: response.shifts?.length ? response.shifts : [createShift()]
      }));
      setMessage("Pengaturan jam kerja berhasil disimpan.");
    } catch (saveError) {
      setError(saveError.message || "Gagal menyimpan pengaturan jam kerja.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) {
    return <div className="rounded-3xl bg-rose-50 p-6 text-sm text-rose-700 shadow-panel">{error}</div>;
  }

  if (!form) {
    return <div className="rounded-3xl bg-white p-6 shadow-panel">Memuat pengaturan jam kerja...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Pengaturan Jam Kerja"
        description="Atur 1 shift tetap atau mode multi-shift lengkap dengan toleransi, hari kerja, dan cutoff alpha."
        actions={
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        }
      >
        {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {message ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, type: "single" }))}
                className={`rounded-3xl border p-4 text-left ${
                  form.type === "single" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                }`}
              >
                <p className="font-semibold text-slate-900">Shift Tetap</p>
                <p className="mt-1 text-sm text-slate-500">Satu jadwal utama untuk semua karyawan.</p>
              </button>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, type: "multi" }))}
                className={`rounded-3xl border p-4 text-left ${
                  form.type === "multi" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                }`}
              >
                <p className="font-semibold text-slate-900">Multi-shift</p>
                <p className="mt-1 text-sm text-slate-500">Kelola satu atau lebih shift aktif untuk operasional.</p>
              </button>
            </div>

            {form.type === "single" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nama Shift">
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    value={form.singleShift.name}
                    onChange={(event) => updateSingleShift("name", event.target.value)}
                  />
                </Field>
                <Field label="Jam Masuk">
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    value={form.singleShift.startTime}
                    onChange={(event) => updateSingleShift("startTime", event.target.value)}
                  />
                </Field>
                <Field label="Jam Pulang">
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    value={form.singleShift.endTime}
                    onChange={(event) => updateSingleShift("endTime", event.target.value)}
                  />
                </Field>
                <Field label="Toleransi Terlambat (menit)">
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    value={form.singleShift.lateToleranceMinutes}
                    onChange={(event) => updateSingleShift("lateToleranceMinutes", Number(event.target.value))}
                  />
                </Field>
                <Field label="Toleransi Pulang Awal (menit)">
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    value={form.singleShift.earlyLeaveToleranceMinutes}
                    onChange={(event) => updateSingleShift("earlyLeaveToleranceMinutes", Number(event.target.value))}
                  />
                </Field>
                <Field label="Cutoff Alpha (menit)">
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    value={form.cutoffMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, cutoffMinutes: Number(event.target.value) }))}
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-4">
                {form.shifts.map((shift, index) => (
                  <div key={`${shift.name}-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 p-4 md:grid-cols-6">
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder="Nama shift"
                      value={shift.name}
                      onChange={(event) => updateShift(index, "name", event.target.value)}
                    />
                    <input
                      type="time"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      value={shift.startTime}
                      onChange={(event) => updateShift(index, "startTime", event.target.value)}
                    />
                    <input
                      type="time"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      value={shift.endTime}
                      onChange={(event) => updateShift(index, "endTime", event.target.value)}
                    />
                    <input
                      type="number"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      value={shift.lateToleranceMinutes}
                      onChange={(event) => updateShift(index, "lateToleranceMinutes", Number(event.target.value))}
                    />
                    <input
                      type="number"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      value={shift.earlyLeaveToleranceMinutes}
                      onChange={(event) => updateShift(index, "earlyLeaveToleranceMinutes", Number(event.target.value))}
                    />
                    <button
                      type="button"
                      disabled={form.shifts.length === 1}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          shifts: current.shifts.filter((_, shiftIndex) => shiftIndex !== index)
                        }))
                      }
                      className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 disabled:opacity-40"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, shifts: [...current.shifts, createShift()] }))}
                  className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  Tambah Shift
                </button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hari Kerja" hint="Pisahkan dengan koma, misalnya Mon,Tue,Wed,Thu,Fri">
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={form.workDays.join(",")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workDays: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                    }))
                  }
                />
              </Field>
              <Field label="Hari Libur Nasional" hint="Format tanggal dipisahkan koma, misalnya 2026-04-10,2026-05-01">
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={form.holidays.join(",")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      holidays: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                    }))
                  }
                />
              </Field>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.32em] text-blue-200">Preview Shift Aktif</p>
            <div className="mt-5 rounded-3xl bg-white/5 p-5">
              {form.type === "single" ? (
                <>
                  <p className="text-2xl font-semibold">{form.singleShift.name || "Shift Utama"}</p>
                  <p className="mt-3 text-slate-300">
                    {form.singleShift.startTime} - {form.singleShift.endTime}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    Terlambat {form.singleShift.lateToleranceMinutes} menit • Pulang awal{" "}
                    {form.singleShift.earlyLeaveToleranceMinutes} menit
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  {form.shifts.map((shift, index) => (
                    <div key={`${shift.name}-${index}`} className="rounded-2xl border border-white/10 p-4">
                      <p className="font-semibold">{shift.name || `Shift ${index + 1}`}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-5 rounded-3xl bg-orange-400 px-5 py-4 text-sm text-slate-950">
              Perubahan langsung memengaruhi perhitungan status hadir, terlambat, dan alpha pada backend aktif.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
