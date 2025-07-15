const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const SCHEMA_PATH = path.join(__dirname, "../schema.sql");
const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

let BACKUP_DIR = config.backupDir;

let backupRunning = false;
let backupQueued = false;

function logBackup(db, action, result, message) {
  if (!db) return;
  db.query(
    'INSERT INTO backup_log (action, result, message) VALUES (?, ?, ?)',
    [action, result, message],
    (err) => {
      if (err) console.error('Backup log error:', err);
    },
  );
}

function setBackupDir(dir) {
  BACKUP_DIR = dir;
}

function getBackupDir() {
  return BACKUP_DIR;
}

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

function backupDatabase(db, cb) {
  if (typeof db === 'function') {
    cb = db;
    db = null;
  }
  if (backupRunning) {
    backupQueued = true;
    const err = new Error("Backup already running");
    err.queued = true;
    if (cb) cb(err);
    return;
  }
  backupRunning = true;
  ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(BACKUP_DIR, `${config.db.name}_${timestamp}.sql`);

  const args = [
    "-h",
    config.db.host,
    "-u",
    config.db.user,
    "-P",
    config.db.port,
    "--add-drop-table",
    config.db.name,
  ];

  const dump = spawn("mysqldump", args, {
    env: { ...process.env, MYSQL_PWD: config.db.password },
  });
  const outStream = fs.createWriteStream(filePath);
  outStream.on("error", (err) => {
    console.error("Write stream error during DB backup:", err);
    if (cb) cb(err);
  });
  dump.stdout.pipe(outStream);

  dump.stderr.on("data", (data) => {
    console.error(`mysqldump error: ${data}`);
  });

  dump.on("error", (err) => {
    console.error("Failed to start mysqldump:", err);
    if (cb) cb(err);
  });

  dump.on("close", (code) => {
    backupRunning = false;
    const runQueued = () => {
      if (backupQueued) {
        backupQueued = false;
        backupDatabase(db);
      }
    };
    if (code === 0) {
      console.log(`Database backup created: ${filePath}`);
      logBackup(db, 'backup', 'success', filePath);
      if (cb) cb(null);
      runQueued();
    } else {
      const err = new Error(`mysqldump exited with code ${code}`);
      console.error("Error during DB backup:", err);
      logBackup(db, 'backup', 'error', err.message);
      fs.unlink(filePath, (delErr) => {
        if (delErr) {
          delErr.deleteFailed = true;
          console.error("Failed to delete incomplete backup:", delErr);
          if (cb) cb(delErr);
        } else if (cb) cb(err);
        runQueued();
      });
    }
  });
}

function scheduleDailyBackup(db) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  setTimeout(() => {
    backupDatabase(db);
    scheduleDailyBackup(db);
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
    "-P",
    config.db.port,
    config.db.name,
  ];
  const proc = spawn("mysql", args, {
    env: { ...process.env, MYSQL_PWD: config.db.password },
  });
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

function applyMigrations(db, cb) {
  fs.readdir(MIGRATIONS_DIR, async (err, files) => {
    if (err) {
      if (err.code === "ENOENT") return cb && cb(null);
      return cb && cb(err);
    }
    try {
      const [rows] = await db
        .promise()
        .query("SELECT version FROM schema_version LIMIT 1");
      let current = rows.length ? rows[0].version : 1;
      const sqlFiles = files
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (const f of sqlFiles) {
        const num = parseInt(f.replace(/[^0-9]/g, ""), 10);
        if (!num || num <= current) continue;
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
        await db.promise().query(sql);
        await db
          .promise()
          .query("UPDATE schema_version SET version=?", [num]);
        current = num;
      }
      if (cb) cb(null);
    } catch (e) {
      if (cb) cb(e);
    }
  });
}

function restoreDatabase(db, file, cb) {
  if (typeof file === 'function') {
    cb = file;
    file = db;
    db = null;
  }
  const args = [
    "--force",
    "-h",
    config.db.host,
    "-u",
    config.db.user,
    "-P",
    config.db.port,
    config.db.name,
  ];

  const mysqlProc = spawn("mysql", args, {
    env: { ...process.env, MYSQL_PWD: config.db.password },
  });
  const inStream = fs.createReadStream(file);
  inStream.on("error", (err) => {
    console.error("Read stream error during DB restore:", err);
    if (cb) cb(err);
  });
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
      logBackup(db, 'restore', 'success', path.basename(file));
      applySchema((err) => {
        if (err) return cb && cb(err);
        applyMigrations(db, cb);
      });
    } else {
      const err = new Error(`mysql exited with code ${code}`);
      console.error("Error restoring DB:", err);
      logBackup(db, 'restore', 'error', err.message);
      if (cb) cb(err);
    }
  });
}

module.exports = {
  backupDatabase,
  restoreDatabase,
  listBackups,
  getBackupDir,
  setBackupDir,
  scheduleDailyBackup,
  applySchema,
  applyMigrations,
};
