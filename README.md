# ILMANA Backend API

REST API untuk platform pembelajaran sains interaktif ILMANA (Ilmu Manusia dan Alam). Dibangun dengan Express.js dan MySQL.

---

## Tech Stack

| Teknologi | Keterangan |
|---|---|
| **Express** | HTTP framework |
| **MySQL2** | Database driver (connection pool, raw SQL) |
| **JWT** | jsonwebtoken — autentikasi |
| **bcryptjs** | Hashing password |
| **Google Gemini AI** | @google/generative-ai — AI tutor |
| **Multer** | Upload file (gambar modul, PDF materi, gambar konten) |
| **EJS** | Template engine (dashboard status + docs) |
| **dotenv** | Konfigurasi environment |

---

## Prasyarat

- Node.js 18+
- MySQL 8+
- npm

## Instalasi & Menjalankan

```bash
# 1. Masuk ke folder backend
cd backend

# 2. Install dependencies
npm install

# 3. Siapkan database MySQL
# Buat database baru, lalu jalankan script SQL dari folder migrations/

# 4. Konfigurasi environment
# Buat file .env dengan isi berikut:
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password_anda
DB_NAME=science_for_life
JWT_SECRET=rahasia_jwt_anda
GEMINI_API_KEY=api_key_gemini_anda
GEMINI_MODEL=gemini-2.5-flash
CLIENT_ORIGINS=http://localhost:3000,https://ilmanainitiative.com,https://www.ilmanainitiative.com

# 5. Seed admin (wajib sekali sebelum pertama kali)
npm run seed:admin

# 6. Jalankan
npm run dev     # development (nodemon)
npm start       # production
```

### Variabel Environment (.env)

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `PORT` | Tidak | `5000` | Port server |
| `DB_HOST` | Ya | `localhost` | Host MySQL |
| `DB_USER` | Ya | `root` | User MySQL |
| `DB_PASSWORD` | Ya | — | Password MySQL |
| `DB_NAME` | Ya | `science_for_life` | Nama database |
| `JWT_SECRET` | Ya | — | Secret key untuk JWT |
| `GEMINI_API_KEY` | Tidak | — | API key Google Gemini (untuk AI chat) |
| `GEMINI_MODEL` | Tidak | `gemini-2.5-flash` | Model Gemini |
| `UPLOAD_DIR` | Tidak | `./uploads` | Path absolut folder upload (biar aman dari redeploy) |
| `CLIENT_ORIGINS` | Tidak | localhost + domain ILMANA | Origin frontend yang boleh mengakses API |

### Scripts

| Script | Perintah | Keterangan |
|---|---|---|
| `dev` | `nodemon server.js` | Development dengan auto-restart |
| `start` | `node server.js` | Production |
| `seed:admin` | `node scripts/seedAdmin.js` | Buat/update admin (`ilmanainitiative@gmail.com`) |

---

## Struktur Folder

```
backend/
├── server.js               # Entry point, mount semua routes
├── config/
│   └── database.js          # Koneksi MySQL (pool)
├── controllers/             # Business logic
│   ├── authController.js
│   ├── moduleController.js
│   ├── subModuleController.js
│   ├── materialController.js
│   ├── questionController.js
│   ├── userProgressController.js
│   ├── userController.js
│   ├── aiChatController.js
│   ├── contactController.js
│   └── uploadController.js
├── middleware/
│   ├── authMiddleware.js    # JWT verify + admin guard
│   └── uploadMiddleware.js  # Konfigurasi Multer
├── routes/                  # Routing (map ke controller)
│   ├── authRoutes.js
│   ├── moduleRoutes.js
│   ├── subModuleRoutes.js
│   ├── materialRoutes.js
│   ├── questionRoutes.js
│   ├── userProgressRoutes.js
│   ├── userRoutes.js
│   ├── aiChatRoutes.js
│   ├── contactRoutes.js
│   └── uploadRoutes.js
├── docs/
│   └── apiCatalog.js        # Katalog endpoint (manual)
├── views/
│   ├── index.ejs            # Dashboard status
│   └── docs.ejs             # Dokumentasi API visual
├── uploads/
│   ├── modules/             # Gambar modul
│   ├── materials/           # File PDF materi
│   └── images/              # Gambar konten (rich text editor)
└── scripts/
    └── seedAdmin.js         # Seeder admin
```

---

## API Endpoints

Semua endpoint di-mount di bawah `/api`.

### Auth

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Registrasi user baru |
| POST | `/api/auth/login` | Public | Login, mengembalikan JWT |
| GET | `/api/auth/me` | Bearer | Data user saat ini |

### Module

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/modules` | Public | Semua module (dengan jumlah sub-module) |
| GET | `/api/modules/:id` | Public | Detail module |
| POST | `/api/modules` | Admin | Buat module (multipart: image) |
| PUT | `/api/modules/:id` | Admin | Update module |
| DELETE | `/api/modules/:id` | Admin | Hapus module |

### SubModule

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/submodules/module/:moduleId` | Public | Sub-module per module |
| GET | `/api/submodules/:id` | Public | Detail sub-module |
| POST | `/api/submodules` | Admin | Buat sub-module |
| PUT | `/api/submodules/:id` | Admin | Update sub-module |
| DELETE | `/api/submodules/:id` | Admin | Hapus sub-module |

### Material

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/materials/submodule/:subModuleId` | Public | Materi per sub-module |
| POST | `/api/materials` | Admin | Buat materi (multipart: PDF) |
| PUT | `/api/materials/:id` | Admin | Update materi |
| DELETE | `/api/materials/:id` | Admin | Hapus materi |

### Question

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/questions/submodule/:subModuleId/:type` | Public | Soal pretest/postest per sub-module |
| POST | `/api/questions` | Admin | Buat soal + opsi jawaban |
| PUT | `/api/questions/:id` | Admin | Update soal + opsi |
| DELETE | `/api/questions/:id` | Admin | Hapus soal |
| POST | `/api/questions/submit` | Bearer | Submit jawaban pretest/postest |

### Progress

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/progress/submodule/:subModuleId` | Bearer | Progress user untuk satu sub-module |
| GET | `/api/progress/user/:userId` | User/Admin | Semua progress milik user |

### User

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/users` | Admin | Semua user + statistik agregat |
| GET | `/api/users/:id` | Admin | Detail user |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Hapus user |
| GET | `/api/users/export-progress?subModuleId=` | Admin | Export CSV nilai |

### AI Chat

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/ai/chat` | Bearer | Chat dengan Gemini AI (scoped ke sub-module) |

### Contact

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/contact/feedback` | Public | Kirim feedback/kontak |
| GET | `/api/contact/feedback` | Admin | Semua feedback |
| PATCH | `/api/contact/feedback/:id/status` | Admin | Ubah status open/done |
| DELETE | `/api/contact/feedback/:id` | Admin | Hapus feedback |

### Upload

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/upload-image` | Admin | Upload gambar konten (rich text editor) |

### Ops

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/health` | Public | Health check JSON |
| GET | `/` | Public | Dashboard status (EJS) |
| GET | `/docs` | Public | Dokumentasi API visual (EJS) |

---

## Autentikasi & Otorisasi

- **JWT** — dikirim via header `Authorization: Bearer <token>`
- **Payload token:** `{ id, email, role }`, expire 7 hari
- **3 level akses:**
  - **Public** — tanpa token (register, login, lihat module/materi)
  - **User/Bearer** — token valid (progress sendiri, submit jawaban, AI chat)
  - **Admin** — token + role `admin` (CRUD konten & user)
- **Middleware chain:** `authMiddleware` (verify JWT) → `adminMiddleware` (cek role)

---

## Alur Pembelajaran

```
Module → SubModule → Pretest → Material → Postest → AI Chat
```

1. User memilih **Module**
2. Membuka **Sub-Module** di dalamnya
3. Mengerjakan **Pretest** — soal pilihan ganda, untuk mengukur pemahaman awal
4. Mempelajari **Material** — teks kaya, video YouTube, file PDF, referensi
5. Mengerjakan **Postest** — soal pilihan ganda
6. Melihat **Hasil** — score, status passing grade, plus **AI Chat** untuk tanya jawab lanjutan

---

## Catatan Deploy

### ⚠️ Upload & Redeploy (Hostinger / VPS)

Masalah paling sering: setelah redeploy, gambar/PDF rusak karena file upload tidak ter-track git.

**Solusi:** gunakan folder di luar project untuk upload.

```bash
# 1. Buat folder persistent di VPS
mkdir -p /var/data/ilmana/uploads
mkdir -p /var/data/ilmana/uploads/modules
mkdir -p /var/data/ilmana/uploads/materials
mkdir -p /var/data/ilmana/uploads/images

# 2. Pindahkan file upload yang sudah ada
cp -r ./uploads/* /var/data/ilmana/uploads/

# 3. Tambahkan ke .env
UPLOAD_DIR=/var/data/ilmana/uploads
```

Setelah ini, redeploy (git pull / restart) tidak akan menghapus file upload.

### Lainnya

- **Upload folders** — pastikan folder upload ada (default `./uploads/{modules,materials,images}`)
- **Kolom `references_json`** — pada tabel `materials`, tambahkan kolom `references_json JSON NULL` setelah kolom `file_url` jika belum ada.
- **Kolom `modules.description`** — jalankan `migrations/004_modules_description_longtext.sql` agar deskripsi modul rich text tidak kepotong.
- **Proxy API production** — pastikan request `https://ilmanainitiative.com/api/*` diarahkan ke backend, bukan ke `index.html` frontend.
- **CORS production** — isi `CLIENT_ORIGINS` dengan domain frontend resmi, misalnya `https://ilmanainitiative.com,https://www.ilmanainitiative.com`.
- **Environment** — set `NODE_ENV=production` pada production agar detail error tidak bocor ke client.
