# Panduan Deploy ILMANA di Hostinger VPS

Panduan lengkap deploy backend (Express.js) dan frontend (React/Vite) ILMANA di Hostinger VPS dengan Phusion Passenger.

---

## Arsitektur

```
┌──────────────────────────────────────────────┐
│  Hostinger VPS                                │
│                                               │
│  ┌──────────────────────────────┐             │
│  │  ilmanainitiative.com        │  Frontend   │
│  │  React/Vite SPA (build)      │             │
│  │  Apache + .htaccess          │             │
│  └──────────┬───────────────────┘             │
│             │ fetch/XHR (CORS)                 │
│             ▼                                  │
│  ┌──────────────────────────────┐             │
│  │  azure-barracuda-...com      │  Backend    │
│  │  Express.js (Passenger)       │             │
│  │  MySQL + JWT + Gemini AI     │             │
│  └──────────────────────────────┘             │
│                                               │
│  ┌──────────────────────────────┐             │
│  │  /home/.../ilmana-uploads/   │  Storage    │
│  │  modules/ materials/ images/ │  (persistent)│
│  └──────────────────────────────┘             │
└──────────────────────────────────────────────┘
```

---

## Struktur Folder di VPS

```
/home/u497230645/
├── domains/
│   ├── azure-barracuda-788858.hostingersite.com/
│   │   ├── nodejs/                    # 🟢 Backend (git repo)
│   │   │   ├── server.js
│   │   │   ├── config/database.js
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── .env → symlink ke ../public_html/.builds/config/.env
│   │   │   └── tmp/restart.txt       # Touch untuk restart
│   │   └── public_html/
│   │       ├── .builds/config/.env    # Env vars production
│   │       └── .htaccess              # Konfigurasi Passenger
│   │
│   └── ilmanainitiative.com/
│       └── public_html/
│           ├── index.html             # React SPA entry
│           ├── assets/                # Built JS + CSS
│           ├── .builds/last-source/   # 🟢 Frontend source (git repo)
│           └── .htaccess              # Apache config + CSP
│
└── ilmana-uploads/                    # Persistent upload storage
    ├── modules/
    ├── materials/
    └── images/
```

---

## Deploy Backend (Express.js)

### 1. Pull perubahan terbaru

```bash
cd /home/u497230645/domains/azure-barracuda-788858.hostingersite.com/nodejs
git pull origin main
```

### 2. Install dependencies (jika ada perubahan package.json)

```bash
npm install --production
```

### 3. Jalankan migrasi (jika ada)

```bash
# Contoh:
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/004_modules_description_longtext.sql
```

### 4. Restart aplikasi Passenger

Passenger akan restart otomatis jika file `tmp/restart.txt` di-touch:

```bash
touch /home/u497230645/domains/azure-barracuda-788858.hostingersite.com/nodejs/tmp/restart.txt
```

Atau cek status:

```bash
# Restart via cPanel → Passenger Manager
# Atau cek log:
tail -f ~/logs/azure-barracuda-788858.hostingersite.com/apache.error.log
tail -f ~/logs/azure-barracuda-788858.hostingersite.com/app.log
```

### 5. Verifikasi backend

```bash
curl https://azure-barracuda-788858.hostingersite.com/api/health
# Harus return: {"message":"Ilmana API is running","status":"OK"}
```

---

## Deploy Frontend (React/Vite)

### 1. Pull perubahan terbaru

```bash
cd /home/u497230645/domains/ilmanainitiative.com/public_html/.builds/last-source
git pull origin main
```

### 2. Build React app

```bash
npm install
npm run build
```

### 3. Copy hasil build ke public_html

```bash
cp -r dist/* /home/u497230645/domains/ilmanainitiative.com/public_html/
```

> ⚠️ Jangan timpa file `.htaccess`, `.builds/`, atau folder khusus lainnya.

### 4. Pastikan .htaccess CSP up-to-date

```bash
cat /home/u497230645/domains/ilmanainitiative.com/public_html/.htaccess | grep connect-src
# Harus mengandung: connect-src 'self' https://azure-barracuda-788858.hostingersite.com
```

---

## Environment Variables

### Backend (.env)

Lokasi: `/home/u497230645/domains/azure-barracuda-788858.hostingersite.com/public_html/.builds/config/.env`

| Variabel | Contoh Nilai | Keterangan |
|----------|-------------|------------|
| `PORT` | `5000` | Port internal (Passenger override) |
| `DB_HOST` | `srv2088.hstgr.io` | Host MySQL Hostinger |
| `DB_USER` | `u497230645_adminsfl` | User database |
| `DB_PASSWORD` | `***` | Password database |
| `DB_NAME` | `u497230645_science4life` | Nama database |
| `JWT_SECRET` | `***` | Secret key JWT (min 64 char) |
| `GEMINI_API_KEY` | `***` | API key Google Gemini |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model Gemini |
| `NODE_ENV` | `production` | Environment mode |
| `UPLOAD_DIR` | `/home/u497230645/ilmana-uploads` | Folder persistent upload |
| `CLIENT_ORIGINS` | `https://ilmanainitiative.com,...` | Origin yang diizinkan CORS |

### Frontend (.env.production)

Lokasi: `/home/u497230645/domains/ilmanainitiative.com/public_html/.builds/config/.env`

| Variabel | Contoh Nilai |
|----------|-------------|
| `VITE_API_URL` | `https://azure-barracuda-788858.hostingersite.com/api` |
| `VITE_SOCKET_URL` | `https://azure-barracuda-788858.hostingersite.com` |

---

## Troubleshooting

### Login gagal setelah deploy
1. **Cek CSP headers:** `curl -I https://ilmanainitiative.com | grep CSP`
2. **Cek browser console:** Error CSP `connect-src` → lihat [CSP-SETUP.md](CSP-SETUP.md)
3. **Cek CORS:** Backend harus allow origin `ilmanainitiative.com`
4. **Cek JWT_SECRET:** Jangan diubah setelah deploy, semua token existing akan invalid

### Error 500 / Blank page
```bash
tail -100 ~/logs/azure-barracuda-788858.hostingersite.com/app.log
```

### Database connection error
```bash
# Test koneksi dari VPS
mysql -h srv2088.hstgr.io -u u497230645_adminsfl -p u497230645_science4life -e "SELECT 1"
```

### Upload files hilang setelah deploy
- Pastikan `UPLOAD_DIR` mengarah ke `/home/u497230645/ilmana-uploads/`
- Folder ini di luar project git sehingga aman dari redeploy

### Passenger tidak restart
```bash
touch ~/domains/azure-barracuda-788858.hostingersite.com/nodejs/tmp/restart.txt
# Atau restart dari Hostinger cPanel → Passenger Manager
```

---

## Checklist Deploy

- [ ] `git pull` di backend repo
- [ ] `npm install --production` (jika package.json berubah)
- [ ] Jalankan migrasi SQL (jika ada)
- [ ] Touch `tmp/restart.txt`
- [ ] `git pull` di frontend repo
- [ ] `npm install && npm run build`
- [ ] Copy `dist/*` ke `public_html/`
- [ ] Verifikasi `.htaccess` CSP
- [ ] Cek `/api/health` endpoint
- [ ] Test login di browser
- [ ] Cek browser console — tidak ada CSP error
