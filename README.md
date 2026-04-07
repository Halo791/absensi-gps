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
- Backend API: Node.js + Express
- Database: PostgreSQL via Neon (`pg`)
- Auth: JWT
- Chart: Recharts

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
```

Catatan:

- `sslmode=require` lazim dipakai pada connection string Neon.
- Backend sekarang membaca `DATABASE_URL` langsung, jadi perubahan ini berlaku untuk lokal maupun deployment.

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

## Deploy ke Netlify

Frontend React sudah siap dideploy ke Netlify dengan file [netlify.toml](/Users/macbookpro/Downloads/project/netlify.toml).

Catatan penting:

- Netlify cocok untuk frontend `frontend/`
- Backend Express + PostgreSQL/Neon saat ini tidak ideal dijalankan penuh di Netlify
- Untuk deployment online, frontend sebaiknya di Netlify dan backend di Render, Railway, atau VPS

## Deploy Backend ke Render

Konfigurasi dasar Render sudah saya siapkan di [render.yaml](/Users/macbookpro/Downloads/project/render.yaml).

### Environment variable backend

Set variable berikut di Render:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_SSL=true
ALLOWED_ORIGIN=https://NAMA-SITE-NETLIFY.netlify.app
PORT=4000
```

### Langkah deploy backend ke Render

1. Push project ke GitHub.
2. Login ke Render.
3. Klik `New` -> `Blueprint` jika ingin memakai [render.yaml](/Users/macbookpro/Downloads/project/render.yaml), atau `Web Service` jika ingin isi manual.
4. Hubungkan repository GitHub.
5. Jika manual, gunakan:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
6. Tambahkan env vars `DATABASE_URL`, `DATABASE_SSL`, dan `ALLOWED_ORIGIN`.
7. Deploy service.
8. Setelah backend online, buka `https://URL-BACKEND/api/health` untuk memastikan respons sehat.

### Seed data demo di Render

Setelah backend pertama kali online, Anda punya 2 pilihan:

1. Jalankan `npm run seed` dari shell Render sekali.
2. Atau panggil endpoint `POST /api/auth/demo/admin`, karena flow demo akan me-reset data demo jika perlu.

Jika ingin seed eksplisit, cara paling aman adalah membuka Render Shell lalu menjalankan:

```bash
cd /opt/render/project/src/backend
npm run seed
```

### Environment variable frontend

Set variable berikut di Netlify:

```bash
VITE_API_BASE_URL=https://URL-BACKEND-ANDA/api
```

Template lokal tersedia di [frontend/.env.example](/Users/macbookpro/Downloads/project/frontend/.env.example).

### Langkah deploy frontend ke Netlify

1. Push project ini ke GitHub.
2. Login ke Netlify.
3. Pilih `Add new site` -> `Import an existing project`.
4. Hubungkan repository GitHub.
5. Gunakan pengaturan build berikut:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Tambahkan environment variable `VITE_API_BASE_URL`.
7. Pastikan `VITE_API_BASE_URL` mengarah ke URL Render backend Anda, misalnya `https://attendance-demo-backend.onrender.com/api`.
8. Deploy.

### Urutan deploy yang disarankan

1. Deploy backend ke Render lebih dulu.
2. Cek `https://URL-BACKEND/api/health`.
3. Ambil URL backend final dari Render.
4. Pasang URL itu ke `VITE_API_BASE_URL` di Netlify.
5. Deploy frontend ke Netlify.

### Kenapa backend belum saya arahkan ke Netlify

Backend saat ini memakai:

- Express server tradisional
- koneksi PostgreSQL ke Neon melalui `DATABASE_URL`
- proses listen port `4000`

Model seperti ini kurang cocok untuk Netlify Functions karena:

- filesystem di serverless bersifat sementara
- koneksi dan state demo akan sulit dipertahankan
- backend ini masih berbentuk service Node penuh, bukan function-per-route

Jika Anda ingin, saya bisa lanjut bantu dengan salah satu opsi berikut:

1. Menyiapkan file final khusus untuk deploy frontend ke Netlify + backend ke Render.
2. Mengubah backend menjadi Netlify Functions + database hosted seperti Supabase/Postgres.
3. Membuat versi demo statis penuh untuk Netlify tanpa backend riil.

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
