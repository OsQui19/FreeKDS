const logger = require('../utils/logger');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const { ensureDefaults } = require('../server/controllers/accessControl');
const config = require('../config');

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  const role = 'management';
  const conn = mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
  });
  const db = conn.promise();

  const hash = await bcrypt.hash(password, 10);
  await ensureDefaults(conn);
  await db.query(
    'INSERT INTO employees (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)',
    [username, hash, role],
  );
  logger.info(`Admin user \`${username}\` is ready.`);
  await db.end();
}

main().catch((err) => {
  logger.error('Error creating admin user:', err);
  process.exit(1);
});
