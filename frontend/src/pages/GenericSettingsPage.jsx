import { useEffect, useState } from "react";
import { Field } from "../components/Field";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

const endpointMap = {
  "location-settings": "/admin/settings/gps",
  "qr-settings": "/admin/settings/qr",
  "security-settings": "/admin/settings/security",
  "general-settings": "/admin/settings/general"
};

const titles = {
  "location-settings": "Lokasi & GPS",
  "qr-settings": "Pengaturan QR Code",
  "security-settings": "Keamanan Absensi",
  "general-settings": "Pengaturan Umum"
};

const descriptions = {
  "location-settings": "Atur titik koordinat kantor dan radius validasi lokasi karyawan.",
  "qr-settings": "Kelola mode QR statis atau dinamis sekaligus preview QR aktif.",
  "security-settings": "Konfigurasi validasi tambahan untuk proses absensi perangkat.",
  "general-settings": "Informasi umum perusahaan dan konfigurasi dasar aplikasi."
};

function getInitialSource(settings, type) {
  return {
    "location-settings": settings.gps,
    "qr-settings": settings.qr,
    "security-settings": settings.security,
    "general-settings": settings.general
  }[type];
}

function buildFields(type, form) {
  const map = {
    "location-settings": [
      { key: "latitude", label: "Latitude Kantor", input: "number", step: "0.000001" },
      { key: "longitude", label: "Longitude Kantor", input: "number", step: "0.000001" },
      { key: "radiusMeters", label: "Radius Maksimal (Meter)", input: "number", min: 1 },
      { key: "mockLocationDetection", label: "Deteksi Mock Location", input: "boolean" }
    ],
    "qr-settings": [
      {
        key: "type",
        label: "Mode QR",
        input: "select",
        options: [
          { value: "dynamic", label: "Dinamis" },
          { value: "static", label: "Statis" }
        ]
      },
      { key: "staticValue", label: "Isi QR Statis", input: "text" },
      {
        key: "rotation",
        label: "Rotasi QR",
        input: "select",
        options: [{ value: "30_seconds", label: "30 detik" }]
      }
    ],
    "security-settings": [
      { key: "attendanceValidationWindowSeconds", label: "Window Validasi (detik)", input: "number", min: 10 },
      { key: "requireSelfie", label: "Wajib Selfie", input: "boolean" },
      { key: "minimumAndroidVersion", label: "Minimum Android", input: "text" },
      { key: "minimumIosVersion", label: "Minimum iOS", input: "text" }
    ],
    "general-settings": [
      { key: "companyName", label: "Nama Perusahaan", input: "text" },
      { key: "timezone", label: "Zona Waktu", input: "text" },
      { key: "backendUrl", label: "Backend URL", input: "text" }
    ]
  };

  return (map[type] || []).filter((field) => Object.hasOwn(form, field.key));
}

export function GenericSettingsPage({ type }) {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setMessage("");
        const settings = await api.get("/admin/settings");
        if (cancelled) return;
        setForm(getInitialSource(settings, type));
        if (type === "qr-settings") {
          const preview = await api.get("/admin/qr/current");
          if (!cancelled) {
            setQrPreview(preview);
          }
        } else {
          setQrPreview(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Gagal memuat pengaturan.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type]);

  async function save() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await api.put(endpointMap[type], form);
      setForm(response);
      setMessage("Perubahan berhasil disimpan.");
      if (type === "qr-settings") {
        setQrPreview(await api.get("/admin/qr/current"));
      }
    } catch (saveError) {
      setError(saveError.message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return <div className="rounded-3xl bg-white p-6 shadow-panel">Memuat pengaturan...</div>;
  }

  const fields = buildFields(type, form);

  return (
    <SectionCard
      title={titles[type]}
      description={descriptions[type]}
      actions={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      }
    >
      {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.key} label={field.label}>
            {field.input === "boolean" ? (
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={String(form[field.key])}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: event.target.value === "true"
                  }))
                }
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            ) : field.input === "select" ? (
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={form[field.key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: event.target.value
                  }))
                }
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.input}
                step={field.step}
                min={field.min}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={form[field.key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]:
                      field.input === "number" ? Number(event.target.value) : event.target.value
                  }))
                }
              />
            )}
          </Field>
        ))}
      </div>

      {type === "qr-settings" && qrPreview ? (
        <div className="mt-6 rounded-[2rem] bg-slate-950 p-6 text-white">
          <p className="text-sm uppercase tracking-[0.28em] text-blue-200">QR Aktif Saat Ini</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
            <img src={qrPreview.image} alt="QR code demo" className="h-44 w-44 rounded-3xl bg-white p-4" />
            <div>
              <p className="text-lg font-semibold">{qrPreview.mode === "static" ? "QR Statis" : "QR Dinamis"}</p>
              <p className="mt-2 text-sm text-slate-300 break-all">{qrPreview.value}</p>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
