// Penjaga JWT_SECRET.
//
// jsonwebtoken tidak menolak secret yang lemah. Kalau JWT_SECRET kosong, verify
// akan selalu gagal (masih aman, closed). Kalau JWT_SECRET diisi dengan nilai
// yang terlalu umum, siapa pun yang tahu nilainya bisa menandatangani token
// dengan role admin dan masuk ke panel. Untuk itu aplikasi harus berhenti saat
// start, bukan menunggu insiden.
//
// Kelemahan yang paling berbahaya justru yang tidak terlihat: secret bawaan
// template .env.example ikut ter-deploy ke produksi, dan semua admin pakai
// secret yang sama.

const MIN_LENGTH = 32;

// Nilai yang pernah muncul di template, di dokumentasi, atau di commit lama.
// Kalau salah satunya dipakai di produksi, semua orang yang pernah membaca repo
// ini bisa menandatangani token admin.
const FORBIDDEN = [
  "ganti-dengan-string-acak-yang-panjang",
  "ganti_dengan_string_acak_yang_panjang",
  "secret",
  "jwt-secret",
  "your-secret-key",
  "your_secret_key",
  "changeme",
  "change-me",
  "ilmana",
  "ilmanainitiative",
];

const isProduction = (nodeEnv) => nodeEnv === "production";

const assertJwtSecretUsable = (nodeEnv, secret) => {
  const problems = [];

  if (typeof secret !== "string" || secret.trim() === "") {
    problems.push("JWT_SECRET kosong");
  } else {
    const value = secret.trim();

    if (value.length < MIN_LENGTH) {
      problems.push(`JWT_SECRET hanya ${value.length} karakter, minimal ${MIN_LENGTH}`);
    }

    const lowered = value.toLowerCase();
    if (FORBIDDEN.some((bad) => lowered === bad || lowered.includes(bad))) {
      problems.push("JWT_SECRET masih memakai nilai contoh dari .env.example");
    }
  }

  if (problems.length === 0) return true;

  const message = [
    "JWT_SECRET tidak bisa dipakai:",
    ...problems.map((p) => `  - ${p}`),
    "",
    "Buat secret acak minimal 32 karakter, misalnya:",
    "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    "Lalu simpan hasilnya ke JWT_SECRET di .env.",
  ].join("\n");

  // Di produksi inidio berhenti total. JWT yang ditandatangani dengan secret
  // lemah berarti akses admin terbuka, jadi lanjut jalan lebih berbahaya
  // daripada tidak start sama sekali.
  if (isProduction(nodeEnv)) {
    throw new Error(message);
  }

  console.warn(`[ILMANA] ${message}`);
  return false;
};

module.exports = { assertJwtSecretUsable, MIN_LENGTH, FORBIDDEN };
