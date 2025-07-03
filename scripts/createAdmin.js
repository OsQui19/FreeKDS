require('../utils/logger');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const { ensureDefaults } = require('../controllers/accessControl');
require('dotenv').config();

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  const role = 'management';
  const conn = mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'freekds',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'kds_db',
  });
  const db = conn.promise();

  const hash = await bcrypt.hash(password, 10);
  await ensureDefaults(conn);
  await db.query(
    'INSERT INTO employees (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)',
    [username, hash, role],
  );
  console.log(`Admin user \`${username}\` is ready.`);
  await db.end();
}

main().catch((err) => {
  console.error('Error creating admin user:', err);
  process.exit(1);
});
