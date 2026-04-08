import { useEffect, useState } from "react";
import { Field } from "../components/Field";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";

const emptyForm = {
  nik: "",
  name: "",
  department: "",
  position: "",
  password: "password123",
  isActive: true
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");
      const data = await api.get("/admin/employees");
      setEmployees(data);
    } catch (loadError) {
      setError(loadError.message || "Gagal memuat daftar karyawan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function createEmployee() {
    try {
      setSubmitting(true);
      setMessage("");
      setError("");
      await api.post("/admin/employees", form);
      setForm(emptyForm);
      setMessage("Karyawan baru berhasil ditambahkan.");
      await loadEmployees();
    } catch (createError) {
      setError(createError.message || "Gagal menambah karyawan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(id) {
    try {
      setBusyId(id);
      setMessage("");
      setError("");
      await api.patch(`/admin/employees/${id}/reset-password`, { password: "password123" });
      setMessage("Password karyawan di-reset ke password123.");
    } catch (resetError) {
      setError(resetError.message || "Gagal mereset password.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(employee) {
    try {
      setBusyId(employee.id);
      setMessage("");
      setError("");
      await api.put(`/admin/employees/${employee.id}`, {
        nik: employee.nik,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        isActive: !employee.is_active
      });
      setMessage(`Status ${employee.name} berhasil diperbarui.`);
      await loadEmployees();
    } catch (toggleError) {
      setError(toggleError.message || "Gagal memperbarui status karyawan.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeEmployee(id) {
    try {
      setBusyId(id);
      setMessage("");
      setError("");
      await api.delete(`/admin/employees/${id}`);
      setMessage("Karyawan berhasil dihapus.");
      await loadEmployees();
    } catch (removeError) {
      setError(removeError.message || "Gagal menghapus karyawan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <SectionCard title="Daftar Karyawan" description="Kelola status aktif, reset password, dan hapus akun karyawan.">
        {message ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {loading ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Memuat daftar karyawan...</div>
        ) : employees.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Belum ada karyawan selain akun demo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">NIK</th>
                  <th className="pb-3">Nama</th>
                  <th className="pb-3">Departemen</th>
                  <th className="pb-3">Jabatan</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="py-3">{employee.nik}</td>
                    <td className="py-3">{employee.name}</td>
                    <td className="py-3">{employee.department}</td>
                    <td className="py-3">{employee.position}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          employee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {employee.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === employee.id}
                          onClick={() => toggleActive(employee)}
                          className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50"
                        >
                          {employee.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === employee.id}
                          onClick={() => resetPassword(employee.id)}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          disabled={busyId === employee.id}
                          onClick={() => removeEmployee(employee.id)}
                          className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Tambah Karyawan" description="Form admin untuk membuat akun karyawan baru.">
        <div className="grid gap-4">
          <Field label="NIK">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.nik}
              onChange={(event) => setForm((current) => ({ ...current, nik: event.target.value }))}
            />
          </Field>
          <Field label="Nama">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="Departemen">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.department}
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
            />
          </Field>
          <Field label="Jabatan">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
            />
          </Field>
          <Field label="Password Awal">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </Field>
          <Field label="Status Akun">
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={String(form.isActive)}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "true" }))}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </Field>
          <button
            type="button"
            disabled={submitting}
            onClick={createEmployee}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-white disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Simpan Karyawan"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
