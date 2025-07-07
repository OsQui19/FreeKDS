const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const BACKUP_DIR = config.backupDir;

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
    `${config.db.name}_${timestamp}.sql`
  );
  const cmd = `mysqldump -h ${config.db.host} -u ${config.db.user} -p${config.db.password} --add-drop-table ${config.db.name} > "${filePath}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error('Error during DB backup:', err);
    } else {
      console.log(`Database backup created: ${filePath}`);
    }
    if (cb) cb(err);
  });
}

function scheduleDailyBackup() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  setTimeout(() => {
    backupDatabase();
    scheduleDailyBackup();
  }, next - now);
}

function restoreDatabase(file, cb) {
  const cmd = `mysql -h ${config.db.host} -u ${config.db.user} -p${config.db.password} ${config.db.name} < "${file}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error('Error restoring DB:', err);
    } else {
      console.log(`Database restored from ${file}`);
    }
    if (cb) cb(err);
  });
}

module.exports = { backupDatabase, restoreDatabase, BACKUP_DIR, scheduleDailyBackup };
