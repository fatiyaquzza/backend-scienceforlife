const mysql = require("mysql2/promise");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  family: 4,
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
