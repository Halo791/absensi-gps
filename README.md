# Ingenio Absensi

Sistem absensi karyawan berbasis web dengan autentikasi JWT, validasi GPS, QR Code, pengelolaan karyawan, dan laporan absensi terpusat.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Express yang dijalankan sebagai Netlify Function
- Database: PostgreSQL via Neon
- Auth: JWT

## Fitur

- Login aman berbasis NIK dan password
- Dashboard admin
- Manajemen karyawan
- Pengaturan jam kerja, lokasi, QR, dan keamanan
- Absensi karyawan dengan validasi QR + GPS
- Pengajuan izin dan lembur
- Riwayat absensi dan ekspor CSV

## Struktur

```text
project/
  backend/
    src/
      auth.js
      bootstrap.js
      config.js
      constants.js
      db.js
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
  netlify/
    functions/
      api.js
```

## Environment

### Backend lokal

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
DATABASE_SSL=true
PORT=4000
ALLOWED_ORIGIN=http://localhost:5173
JWT_SECRET=ganti-dengan-secret-yang-panjang-dan-unik
QR_SECRET=ganti-dengan-secret-qr-yang-unik
```

### Frontend lokal

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

### Netlify production

```bash
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_SSL=true
ALLOWED_ORIGIN=https://ingenio-absensi.netlify.app
VITE_API_BASE_URL=/api
JWT_SECRET=ganti-dengan-secret-yang-panjang-dan-unik
QR_SECRET=ganti-dengan-secret-qr-yang-unik
```

## Menjalankan Lokal

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

## Seed Data Awal

Untuk mengisi data awal ke PostgreSQL:

```bash
npm run seed --workspace backend
```

Perintah ini akan memastikan schema, admin awal, roster karyawan, pengaturan dasar, dan shift awal tersedia.

## Verifikasi

```bash
npm run verify
```

## Deploy Netlify

Project ini disiapkan untuk deploy sebagai satu site Netlify:

- Frontend: `frontend/dist`
- Backend API: `/.netlify/functions/api`

Gunakan build command:

```bash
npm run build
```

## Endpoint Utama

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/employee/dashboard`
- `POST /api/employee/attendance`
- `GET /api/admin/dashboard`
- `GET /api/admin/employees`
- `POST /api/admin/employees`
- `PUT /api/admin/employees/:id`
- `PATCH /api/admin/employees/:id/reset-password`
- `GET /api/admin/attendance`
- `GET /api/admin/attendance/export.csv`
- `GET /api/admin/settings`
- `PUT /api/admin/settings/general`
- `PUT /api/admin/settings/work`
- `PUT /api/admin/settings/gps`
- `PUT /api/admin/settings/qr`
- `PUT /api/admin/settings/security`
