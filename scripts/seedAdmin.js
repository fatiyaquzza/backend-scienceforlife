/**
 * Script untuk membuat/update akun admin
 * Email: adminSFL@gmail.com
 * Password: admin123
 *
 * Jalankan dari folder backend: node scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const ADMIN_EMAIL = 'adminSFL@gmail.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Admin Science For Life';

async function seedAdmin() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'science_for_life'
    });

    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);

    const [existing] = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      await connection.execute(
        'UPDATE users SET name = ?, password = ?, role = ? WHERE email = ?',
        [ADMIN_NAME, hashedPassword, 'admin', ADMIN_EMAIL]
      );
    } else {
      await connection.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, 'admin']
      );
    }
  } catch (err) {
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seedAdmin();
