const mysql = require("mysql2/promise");

// Port ikut diteruskan. Sebelumnya createPool tidak menerima port sama sekali,
// jadi DB_PORT di environment diam-diam dibuang dan semua koneksi selalu
// jatuh ke 3306. scripts/seedAdmin.js sudah membaca DB_PORT sejak dulu, jadi
// kedua cara itu bisa mengarah ke server berbeda kalau portnya diisi.
// Nilai kosong tetap 3306, jadi perilaku produksi tidak berubah.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
pool
  .getConnection()
  .then((connection) => {
    console.log("DB Connected via socket");
    connection.release();
  })
  .catch((err) => {
    console.error("DB Error:", err.message);
  });

module.exports = pool;
