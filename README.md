# Demo Aplikasi Absensi Karyawan

Project ini adalah starter full-stack untuk demo absensi karyawan dengan dua role:

- `Admin / HRD`: login demo, sidebar konfigurasi lengkap, dashboard, pengaturan jam kerja, QR, GPS, keamanan, laporan, izin, dan lembur.
- `Karyawan`: login demo, check-in/check-out, lihat riwayat, ajukan izin/sakit, dan ajukan lembur.

Fokus utama implementasi ini ada pada:

- sidebar admin yang lengkap dan responsif
- pengaturan jam kerja single-shift dan multi-shift
- akun demo admin dan karyawan dengan reset data otomatis
- API backend modular yang langsung menerapkan setting baru tanpa restart

## Stack

- Frontend admin/web: React + Vite + Tailwind CSS
- Backend API: Netlify Functions yang membungkus Express app
- Database: PostgreSQL via Neon (`pg`)
- Auth: JWT
- Chart: Recharts

## Peningkatan Kesiapan Produksi

Versi repo ini sekarang sudah ditingkatkan pada area berikut:

- JWT secret dibaca dari environment variable, bukan hardcoded
- endpoint demo hanya aktif saat `DEMO_MODE=true`
- payload API divalidasi sebelum masuk ke database
- export CSV memakai escaping aman untuk koma dan tanda kutip
- tersedia script verifikasi cepat untuk backend syntax dan frontend build

## Struktur Folder

```text
project/
  backend/
    src/
      auth.js
      constants.js
      db.js
      index.js
      repository.js
      seed.js
    schema.sql
  frontend/
    src/
      components/
      layout/
      lib/
      pages/
      App.jsx
      main.jsx
```

## Akun Demo

- Admin demo:
  - NIK: `ADM001`
  - Password: `demo123`
- Karyawan demo:
  - NIK: `EMP001`
  - Password: `karyawan123`

Login demo melalui tombol akan me-reset data demo ke kondisi default agar aman untuk testing.

## Fitur yang Sudah Disiapkan

- Login manual dan tombol `Login Demo sebagai Admin`
- Tombol `Login Demo sebagai Karyawan`
- Dashboard admin dengan statistik kehadiran
- Sidebar admin dengan menu:
  - Dashboard
  - Pengaturan Jam Kerja
  - Lokasi & GPS
  - QR Code
  - Keamanan
  - Manajemen Karyawan
  - Riwayat & Laporan
  - Izin / Sakit
  - Lembur
  - Pengaturan Umum
- Pengaturan jam kerja:
  - shift tetap
  - multi-shift
  - toleransi terlambat
  - toleransi pulang awal
  - hari kerja
  - hari libur
  - cutoff alpha
- Pengaturan QR:
  - mode statis
  - mode dinamis
  - preview QR aktif
- Manajemen karyawan:
  - tambah karyawan
  - reset password
  - hapus karyawan
- Riwayat absen dan ekspor CSV
- Request izin/sakit
- Request lembur
- Simulasi check-in/check-out dengan metode `gps_qr`

## Setup Neon

1. Buat project database di Neon.
2. Ambil connection string dari dashboard Neon.
3. Salin file [backend/.env.example](/Users/macbookpro/Downloads/project/backend/.env.example) menjadi `.env` di folder `backend`.
4. Isi:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATABASE_SSL=true
PORT=4000
JWT_SECRET=ganti-dengan-secret-yang-panjang-dan-unik
DEMO_MODE=true
```

Catatan:

- `sslmode=require` lazim dipakai pada connection string Neon.
- Backend sekarang membaca `DATABASE_URL` langsung, jadi perubahan ini berlaku untuk lokal maupun deployment.
- Untuk production, set `DEMO_MODE=false` agar endpoint reset/login demo nonaktif.

## Cara Menjalankan Lokal

### 1. Jalankan backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

Backend berjalan di `http://localhost:4000`.

### 2. Jalankan frontend

```bash
cd frontend
npm install
npm run dev
```

Jika backend tidak berjalan di lokal default, buat file `.env` di folder `frontend`:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

Lalu jalankan:

```bash
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

### Verifikasi cepat

Dari root project:

```bash
npm run verify
```

Perintah ini akan memeriksa syntax backend dan build frontend.

## Deploy ke Netlify

Project ini sekarang siap dideploy penuh ke Netlify dengan file [netlify.toml](/Users/macbookpro/Downloads/project/netlify.toml), sementara database tetap di Neon.

Catatan penting:

- Frontend dan backend function sama-sama jalan di Netlify
- Database tetap memakai Neon
- Endpoint API akan dilayani lewat `/.netlify/functions/api` dan diakses dari frontend sebagai `/api`

### Environment variable frontend

Set variable berikut di Netlify:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_SSL=true
ALLOWED_ORIGIN=https://NAMA-SITE-NETLIFY.netlify.app
VITE_API_BASE_URL=/api
JWT_SECRET=ganti-dengan-secret-yang-panjang-dan-unik
DEMO_MODE=false
```

Template lokal tersedia di [frontend/.env.example](/Users/macbookpro/Downloads/project/frontend/.env.example).

### Langkah deploy penuh ke Netlify

1. Push project ini ke GitHub.
2. Login ke Netlify.
3. Pilih `Add new site` -> `Import an existing project`.
4. Hubungkan repository GitHub.
5. Gunakan pengaturan build berikut:
   - Base directory: kosongkan
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
6. Tambahkan env vars:
   - `DATABASE_URL`
   - `DATABASE_SSL=true`
   - `ALLOWED_ORIGIN=https://NAMA-SITE-NETLIFY.netlify.app`
   - `VITE_API_BASE_URL=/api`
7. Deploy site.

### Seed data demo di Netlify

Seed tidak perlu dijalankan manual di Netlify untuk demo awal. Saat function pertama kali dipanggil, bootstrap akan memastikan schema dan akun demo tersedia.

Flow demo login admin atau karyawan juga tetap akan mereset data demo.

### Endpoint hasil deploy

Setelah online:

```bash
https://NAMA-SITE.netlify.app/api/health
```

### Kenapa backend belum saya arahkan ke Netlify

- Backend lokal tetap bisa dijalankan sebagai Express biasa untuk development
- Saat deploy, Express app yang sama dibungkus oleh Netlify Function tunggal
- koneksi dan state demo akan sulit dipertahankan
- karena itu data demo tetap sebaiknya dianggap sementara dan resettable

Jika Anda ingin, saya bisa lanjut bantu dengan salah satu opsi berikut:

1. Commit dan push refactor Netlify Functions ini ke GitHub.
2. Membantu verifikasi setting Netlify sebelum Anda klik deploy.
3. Menambahkan `netlify dev` workflow bila Anda ingin testing lokal yang lebih mirip production.

## Endpoint Penting

### Auth

- `POST /api/auth/login`
- `POST /api/auth/demo/admin`
- `POST /api/auth/demo/employee`
- `POST /api/demo/reset`

### Admin

- `GET /api/admin/dashboard`
- `GET /api/admin/settings`
- `PUT /api/admin/settings/general`
- `PUT /api/admin/settings/work`
- `PUT /api/admin/settings/gps`
- `PUT /api/admin/settings/qr`
- `PUT /api/admin/settings/security`
- `GET /api/admin/qr/current`
- `GET /api/admin/employees`
- `POST /api/admin/employees`
- `PUT /api/admin/employees/:id`
- `DELETE /api/admin/employees/:id`
- `PATCH /api/admin/employees/:id/reset-password`
- `GET /api/admin/attendance`
- `GET /api/admin/attendance/export.csv`
- `GET /api/admin/leave-requests`
- `PATCH /api/admin/leave-requests/:id`
- `GET /api/admin/overtime-requests`
- `PATCH /api/admin/overtime-requests/:id`

### Employee

- `GET /api/employee/dashboard`
- `POST /api/employee/attendance`
- `POST /api/employee/leave-requests`
- `POST /api/employee/overtime-requests`

## Catatan Demo

- Semua data demo sekarang berada di database PostgreSQL/Neon yang ditunjuk oleh `DATABASE_URL`
- Login demo akan me-reset database agar sesi uji tidak saling mengganggu
- Perubahan setting langsung dibaca saat request berikutnya, jadi tidak perlu restart backend
- Untuk production, tetap disarankan memisahkan database demo dari database riil

## Skema Database

Tabel utama yang tersedia:

- `users`
- `attendance`
- `settings`
- `shifts`
- `leave_requests`
- `overtime_requests`

Referensi SQL ada di [backend/schema.sql](/Users/macbookpro/Downloads/project/backend/schema.sql).
