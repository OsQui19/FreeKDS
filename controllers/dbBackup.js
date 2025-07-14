const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const SCHEMA_PATH = path.join(__dirname, "../schema.sql");

const BACKUP_DIR = config.backupDir;

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function listBackups(cb) {
  ensureDir();
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return cb(err);
    const list = files
      .filter((f) => f.endsWith('.sql'))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, mtime: stat.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    cb(null, list);
  });
}

function backupDatabase(cb) {
  ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(BACKUP_DIR, `${config.db.name}_${timestamp}.sql`);

  const args = [
    "-h",
    config.db.host,
    "-u",
    config.db.user,
    `-p${config.db.password}`,
    "--add-drop-table",
    config.db.name,
  ];

  const dump = spawn("mysqldump", args);
  const outStream = fs.createWriteStream(filePath);
  dump.stdout.pipe(outStream);

  dump.stderr.on("data", (data) => {
    console.error(`mysqldump error: ${data}`);
  });

  dump.on("error", (err) => {
    console.error("Failed to start mysqldump:", err);
    if (cb) cb(err);
  });

  dump.on("close", (code) => {
    if (code === 0) {
      console.log(`Database backup created: ${filePath}`);
      if (cb) cb(null);
    } else {
      const err = new Error(`mysqldump exited with code ${code}`);
      console.error("Error during DB backup:", err);
      if (cb) cb(err);
    }
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

function applySchema(cb) {
  if (!fs.existsSync(SCHEMA_PATH)) return cb && cb(null);
  const args = [
    "--force",
    "-h",
    config.db.host,
    "-u",
    config.db.user,
    `-p${config.db.password}`,
    config.db.name,
  ];
  const proc = spawn("mysql", args);
  fs.createReadStream(SCHEMA_PATH).pipe(proc.stdin);

  proc.stderr.on("data", (data) => {
    console.error(`mysql schema error: ${data}`);
  });
  proc.on("error", (err) => {
    console.error("Failed to apply schema:", err);
    if (cb) cb(err);
  });
  proc.on("close", (code) => {
    if (code === 0) return cb && cb(null);
    const err = new Error(`mysql exited with code ${code}`);
    console.error("Error applying schema:", err);
    if (cb) cb(err);
  });
}

function restoreDatabase(file, cb) {
  const args = [
    "--force",
    "-h",
    config.db.host,
    "-u",
    config.db.user,
    `-p${config.db.password}`,
    config.db.name,
  ];

  const mysqlProc = spawn("mysql", args);
  const inStream = fs.createReadStream(file);
  inStream.pipe(mysqlProc.stdin);

  mysqlProc.stderr.on("data", (data) => {
    console.error(`mysql error: ${data}`);
  });

  mysqlProc.on("error", (err) => {
    console.error("Failed to start mysql:", err);
    if (cb) cb(err);
  });

  mysqlProc.on("close", (code) => {
    if (code === 0) {
      console.log(`Database restored from ${file}`);
      applySchema((err) => {
        if (err) return cb && cb(err);
        if (cb) cb(null);
      });
    } else {
      const err = new Error(`mysql exited with code ${code}`);
      console.error("Error restoring DB:", err);
      if (cb) cb(err);
    }
  });
}

module.exports = {
  backupDatabase,
  restoreDatabase,
  listBackups,
  BACKUP_DIR,
  scheduleDailyBackup,
};
