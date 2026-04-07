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

export function GenericSettingsPage({ type }) {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [qrPreview, setQrPreview] = useState(null);

  useEffect(() => {
    api.get("/admin/settings").then((settings) => {
      const source = {
        "location-settings": settings.gps,
        "qr-settings": settings.qr,
        "security-settings": settings.security,
        "general-settings": settings.general
      }[type];
      setForm(source);
    });
    if (type === "qr-settings") {
      api.get("/admin/qr/current").then(setQrPreview);
    }
  }, [type]);

  if (!form) {
    return <div className="rounded-3xl bg-white p-6 shadow-panel">Memuat pengaturan...</div>;
  }

  async function save() {
    await api.put(endpointMap[type], form);
    setMessage("Perubahan berhasil disimpan.");
    if (type === "qr-settings") {
      setQrPreview(await api.get("/admin/qr/current"));
    }
  }

  const titles = {
    "location-settings": "Pengaturan Lokasi & GPS",
    "qr-settings": "Pengaturan QR Code",
    "security-settings": "Pengaturan Keamanan",
    "general-settings": "Pengaturan Umum"
  };

  return (
    <SectionCard
      title={titles[type]}
      description="Halaman konfigurasi tambahan untuk melengkapi sidebar admin."
      actions={
        <button type="button" onClick={save} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
          Simpan
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(form).map(([key, value]) => (
          <Field key={key} label={key}>
            {typeof value === "boolean" ? (
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={String(value)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value === "true"
                  }))
                }
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            ) : (
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={value}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: typeof value === "number" ? Number(event.target.value) : event.target.value
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
              <p className="mt-2 text-sm text-slate-300">{qrPreview.value}</p>
            </div>
          </div>
        </div>
      ) : null}
      {message ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
    </SectionCard>
  );
}
