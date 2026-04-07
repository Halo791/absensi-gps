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

  function loadEmployees() {
    api.get("/admin/employees").then(setEmployees);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function createEmployee() {
    await api.post("/admin/employees", form);
    setForm(emptyForm);
    setMessage("Karyawan baru berhasil ditambahkan.");
    loadEmployees();
  }

  async function resetPassword(id) {
    await api.patch(`/admin/employees/${id}/reset-password`, { password: "password123" });
    setMessage("Password karyawan di-reset ke password123.");
  }

  async function removeEmployee(id) {
    await api.delete(`/admin/employees/${id}`);
    setMessage("Karyawan berhasil dihapus.");
    loadEmployees();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <SectionCard title="Daftar Karyawan" description="Tambah, kelola status aktif, dan reset password akun karyawan.">
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
                  <td className="py-3">{employee.is_active ? "Aktif" : "Nonaktif"}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => resetPassword(employee.id)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEmployee(employee.id)}
                        className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
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
      </SectionCard>

      <SectionCard title="Tambah Karyawan" description="Form sederhana untuk menambah user demo baru.">
        <div className="grid gap-4">
          <Field label="NIK">
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={form.nik} onChange={(event) => setForm((current) => ({ ...current, nik: event.target.value }))} />
          </Field>
          <Field label="Nama">
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Departemen">
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} />
          </Field>
          <Field label="Jabatan">
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} />
          </Field>
          <Field label="Password Awal">
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </Field>
          <button type="button" onClick={createEmployee} className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
            Simpan Karyawan
          </button>
          {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        </div>
      </SectionCard>
    </div>
  );
}
