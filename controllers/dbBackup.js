const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backupDatabase(cb) {
  ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(
    BACKUP_DIR,
    `${process.env.DB_NAME || 'kds_db'}_${timestamp}.sql`
  );
  const cmd = `mysqldump -h ${process.env.DB_HOST || '127.0.0.1'} -u ${process.env.DB_USER || 'freekds'} -p${process.env.DB_PASS || ''} --add-drop-table ${process.env.DB_NAME || 'kds_db'} > "${filePath}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error('Error during DB backup:', err);
    } else {
      console.log(`Database backup created: ${filePath}`);
    }
    if (cb) cb(err);
  });
}

function restoreDatabase(file, cb) {
  const cmd = `mysql -h ${process.env.DB_HOST || '127.0.0.1'} -u ${process.env.DB_USER || 'freekds'} -p${process.env.DB_PASS || ''} ${process.env.DB_NAME || 'kds_db'} < "${file}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error('Error restoring DB:', err);
    } else {
      console.log(`Database restored from ${file}`);
    }
    if (cb) cb(err);
  });
}

module.exports = { backupDatabase, restoreDatabase, BACKUP_DIR };
