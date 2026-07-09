# CSP Setup — ILMANA

Dokumentasi konfigurasi Content Security Policy (CSP) untuk ILMANA.

---

## Masalah Umum

### Gejala
Setelah deploy, login gagal. Browser console menunjukkan error:
```
Connecting to 'https://azure-barracuda-788858.hostingersite.com/api/auth/login'
violates the following Content Security Policy directive: "connect-src 'self'".
The action has been blocked.
```

### Root Cause
CSP membatasi domain mana yang boleh dihubungi oleh halaman web. Frontend ILMANA di `ilmanainitiative.com` perlu melakukan fetch/XHR ke backend di `azure-barracuda-788858.hostingersite.com`.

Jika `connect-src` hanya berisi `'self'`, browser **memblokir semua koneksi** ke domain yang berbeda.

---

## Arsitektur CSP ILMANA

CSP di-set di **TIGA tempat**. Ketiganya harus konsisten:

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│                                                     │
│  Halaman: https://ilmanainitiative.com              │
│  CSP dari: .htaccess frontend                       │
│  connect-src: 'self' + backend domain ✅            │
│                                                     │
│  ↓ fetch('/api/auth/login')                         │
│  ↓ ke: https://azure-barracuda-...com/api/...       │
│  ↓ DIIZINKAN karena backend domain ada di CSP       │
│                                                     │
│  Response dari backend membawa CSP header juga      │
│  Tapi ini tidak mempengaruhi halaman frontend        │
└─────────────────────────────────────────────────────┘
```

---

## Konfigurasi per File

### 1. Frontend `.htaccess`
**Lokasi:** `/home/u497230645/domains/ilmanainitiative.com/public_html/.htaccess`

Ini adalah CSP yang **paling penting** karena dia yang membungkus halaman React SPA.

```apache
Header always set Content-Security-Policy "\
default-src 'self'; \
script-src 'self' 'unsafe-inline'; \
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
font-src 'self' https://fonts.gstatic.com data:; \
img-src 'self' data: https:; \
connect-src 'self' https://azure-barracuda-788858.hostingersite.com; \
frame-src https://www.youtube.com https://www.youtube-nocookie.com; \
object-src 'none'; \
base-uri 'self'; \
frame-ancestors 'none'; \
upgrade-insecure-requests"
```

**Kunci:** `connect-src 'self' https://azure-barracuda-788858.hostingersite.com`

### 2. Backend `.htaccess` (Apache/Passenger)
**Lokasi:** `/home/u497230645/domains/azure-barracuda-788858.hostingersite.com/public_html/.htaccess`

CSP untuk response yang keluar dari backend domain.

```apache
connect-src 'self' https://ilmanainitiative.com https://www.ilmanainitiative.com
```

**Kunci:** Izinkan koneksi ke frontend domain (untuk WebSocket, redirect, dll).

### 3. Backend `server.js` (Express.js)
**Lokasi:** `nodejs/server.js` → fungsi `securityHeaders`

CSP yang di-set oleh Express sebagai response header. Harus konsisten dengan `.htaccess` backend.

```javascript
"connect-src 'self' https://ilmanainitiative.com https://www.ilmanainitiative.com"
```

---

## Cara Cek CSP

### Cek header dari frontend
```bash
curl -I https://ilmanainitiative.com 2>/dev/null | grep -i content-security
```

**Output yang benar:**
```
content-security-policy: default-src 'self'; ... connect-src 'self' https://azure-barracuda-788858.hostingersite.com; ...
```

### Cek header dari backend
```bash
curl -I https://azure-barracuda-788858.hostingersite.com/api/health 2>/dev/null | grep -i content-security
```

### Cek di browser
1. Buka DevTools (F12)
2. Tab **Console** — cari error CSP
3. Tab **Network** — klik request yang gagal, lihat response headers

---

## Perubahan CSP: Checklist

Setiap kali mengubah CSP, pastikan:

- [ ] Update `ilmanainitiative.com/public_html/.htaccess`
- [ ] Update `ilmanainitiative.com/.../last-source/public/.htaccess` (source repo)
- [ ] Update `azure-barracuda-.../public_html/.htaccess` (jika relevan)
- [ ] Update `azure-barracuda-.../nodejs/server.js` (jika relevan)
- [ ] Commit dan push perubahan ke GitHub
- [ ] Test login di browser — cek console tidak ada error CSP
- [ ] Test fitur lain: upload gambar, video YouTube, AI chat

---

## Directive CSP yang Digunakan

| Directive | Nilai | Alasan |
|-----------|-------|--------|
| `default-src` | `'self'` | Fallback: hanya izinkan dari origin sendiri |
| `script-src` | `'self' 'unsafe-inline'` | React memerlukan inline script (Vite) |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Tailwind + Google Fonts |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Google Fonts + data URI |
| `img-src` | `'self' data: https:` | Gambar dari semua sumber HTTPS |
| `connect-src` | `'self' [domain lain]` | **KRITIS: fetch/XHR/WebSocket** |
| `frame-src` | `https://www.youtube.com https://www.youtube-nocookie.com` | Embed video YouTube |
| `object-src` | `'none'` | Blokir Flash/plugin |
| `base-uri` | `'self'` | Cegah base tag injection |
| `frame-ancestors` | `'none'` | Cegah clickjacking |
| `upgrade-insecure-requests` | (kosong) | Auto-upgrade HTTP ke HTTPS |

---

## Jika Ingin Menambah Domain Baru

Misal ingin menambah domain backend baru `https://api-baru.example.com`:

1. Tambahkan ke **frontend** `.htaccess`:
   ```
   connect-src 'self' https://azure-barracuda-788858.hostingersite.com https://api-baru.example.com
   ```

2. Tambahkan ke CORS whitelist di `server.js` atau `.env`:
   ```
   CLIENT_ORIGINS=https://ilmanainitiative.com,https://api-baru.example.com
   ```

3. Jika domain baru perlu fetch ke backend, tambahkan juga ke CSP backend.

---

## Troubleshooting CSP

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `connect-src 'self'` blocked | Frontend fetch ke domain lain | Tambahkan domain backend ke `connect-src` frontend |
| `script-src` blocked | Inline script atau eval | Pastikan `'unsafe-inline'` ada di `script-src` |
| `img-src` blocked | Gambar dari URL eksternal | Pastikan `https:` ada di `img-src` |
| `frame-src` blocked | Embed YouTube tidak muncul | Pastikan YouTube domain ada di `frame-src` |
| `font-src` blocked | Font tidak muncul | Pastikan `https://fonts.gstatic.com` + `data:` ada |

---

## Catatan

- CSP di `.htaccess` menggunakan `Header always set` — header akan selalu disertakan dalam setiap response Apache
- CSP di `server.js` menggunakan `res.setHeader()` — akan berfungsi untuk response yang ditangani Express
- Jika ada reverse proxy (Cloudflare, Nginx), CSP bisa juga di-set di level proxy tersebut
- **Jangan pakai `Content-Security-Policy-Report-Only`** di production — itu hanya untuk testing
