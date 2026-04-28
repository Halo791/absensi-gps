export const EMPLOYEE_ROSTER = [
  { name: "Yusuf", nik: "00001", password: "yusuf123" },
  { name: "Sabrina Masya Haura", nik: "00002", password: "sabrina123" },
  { name: "Widya Ayu Purbasari", nik: "00003", password: "widya123" },
  { name: "M. Sahrul Evendi", nik: "00004", password: "sahrul123" },
  { name: "Andhika Ardyanto", nik: "00005", password: "andika123" },
  { name: "Khoirul Amin", nik: "00006", password: "khoirul123" },
  { name: "Kusbiyantoro", nik: "00007", password: "kusbiyantoro123" },
  { name: "Putu Ardhani", nik: "00008", password: "putu123" },
  { name: "Rayhan Daafarit Alfradam", nik: "00009", password: "rayhan123" },
  { name: "Nofrian Deny Hendrawan", nik: "00010", password: "deny123" },
  { name: "Virra Luyzza Mia Sintia", nik: "00011", password: "virra123" },
  { name: "Fatia Fatima Viola Bella Violina", nik: "00012", password: "fatia123" },
  { name: "Andita Nurul Izzah", nik: "00013", password: "andita123" },
  { name: "Gilang Andra Kusuma", nik: "00014", password: "gilang123" },
  { name: "Rezaldy Patriceo Wisnu Pratama", nik: "00015", password: "rezaldy123" },
  { name: "Muhamad Risky Agus Saputra", nik: "00016", password: "muhammad123" },
  { name: "Reyhan Maula Anafidz", nik: "00017", password: "maula123" }
];

export function normalizeEmployeeRecord(employee) {
  return {
    ...employee,
    department: employee.department || "Operasional",
    position: employee.position || "Karyawan",
    role: employee.role || "employee",
    isActive: employee.isActive ?? true
  };
}
