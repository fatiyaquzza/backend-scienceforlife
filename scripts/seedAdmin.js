/**
 * Script untuk membuat atau memperbarui akun admin.
 *
 * Secrets TIDAK pernah ditulis di berkas ini. Password diambil dari environment
 * variable ADMIN_PASSWORD, atau dibangkitkan acak dan ditampilkan satu kali.
 *
 * Pemakaian:
 *   node scripts/seedAdmin.js                     buat admin, atau perbarui
 *                                                 nama/role tanpa mengubah
 *                                                 password yang sudah ada
 *   node scripts/seedAdmin.js --reset-password    rotasi password admin
 *   node scripts/seedAdmin.js --generate          rotasi ke password acak
 *
 * Environment variable opsional:
 *   ADMIN_EMAIL, ADMIN_NAME, NODE_ENV, ALLOW_PRODUCTION_SEED
 */

const path = require("path");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
  });
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "1") {
  console.error(
    "Seed admin ditolak pada environment production. Set ALLOW_PRODUCTION_SEED=1 " +
      "jika memang ini yang Anda inginkan.",
  );
  process.exit(1);
}

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ilmanainitiative@gmail.com";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin Ilmana";

const args = new Set(process.argv.slice(2));
const GENERATE = args.has("--generate");
// Memberi ADMIN_PASSWORD secara eksplisit dianggap bermaksud merotasi. Kalau
// tidak, nilainya akan diabaikan diam-diam dan admin tetap memakai password
// lama tanpa Whoever mengira password baru sudah aktif.
const RESET_PASSWORD = args.has("--reset-password") || GENERATE || Boolean(process.env.ADMIN_PASSWORD);

// Password yang pernah ditulis di berkas ini sebelumnya. Menolaknya mencegah
// skrip diam-diam mengembalikan admin ke password lemah yang sudah bocor.
const REJECTED = new Set(["admin123", "admin1234", "password", "123456", "admin"]);

function generatePassword() {
  // Alfabet ambigu (0/O, 1/l/I) sengaja dibuang agar hasil salin-tempel aman.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*";
  const bytes = crypto.randomBytes(24);
  let out = "";
  for (let i = 0; i < 24; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function assertStrong(password) {
  if (password.length < 12) {
    throw new Error("Password admin minimal 12 karakter.");
  }
  if (REJECTED.has(password.toLowerCase())) {
    throw new Error(
      "Password itu pernah dipakai di repository publik dan tidak boleh dipakai lagi.",
    );
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password));
  if (classes.length < 3) {
    throw new Error("Password admin perlu minimal tiga dari: huruf kecil, huruf besar, angka, simbol.");
  }
  return password;
}

function resolvePassword() {
  if (GENERATE) return assertStrong(generatePassword());
  const provided = process.env.ADMIN_PASSWORD;
  if (provided) return assertStrong(provided);
  throw new Error(
    "Password tidak ditemukan. Pakai --generate, atau set ADMIN_PASSWORD di environment.",
  );
}

async function seedAdmin() {
  let connection;
  let shownPassword = null;

  try {
    const password = RESET_PASSWORD ? resolvePassword() : null;
    if (password) shownPassword = password;

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [existing] = await connection.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [ADMIN_EMAIL],
    );

    if (existing.length > 0) {
      if (password) {
        await connection.execute(
          "UPDATE users SET name = ?, password = ?, role = ? WHERE email = ?",
          [ADMIN_NAME, bcrypt.hashSync(password, 10), "admin", ADMIN_EMAIL],
        );
      } else {
        await connection.execute(
          "UPDATE users SET name = ?, role = ? WHERE email = ?",
          [ADMIN_NAME, "admin", ADMIN_EMAIL],
        );
      }
    } else {
      if (!password) {
        throw new Error(
          `Akun ${ADMIN_EMAIL} belum ada, jadi password wajib diberikan. Pakai --generate.`,
        );
      }
      await connection.execute(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [ADMIN_NAME, ADMIN_EMAIL, bcrypt.hashSync(password, 10), "admin"],
      );
    }

    console.log(`Admin siap: ${ADMIN_EMAIL}`);
    if (password) {
      if (existing.length > 0) console.log("Password dirotasi.");
      console.log("");
      console.log("  Simpan password ini sekarang, hanya ditampilkan sekali:");
      console.log(`  ${password}`);
    } else {
      console.log("Password lama tidak diubah. Tambahkan --reset-password untuk merotasi.");
    }
  } finally {
    if (connection) await connection.end();
  }
}

seedAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
