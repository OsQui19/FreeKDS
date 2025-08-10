const logger = require('../utils/logger');
const settingsCache = require('../controllers/settingsCache');
const unitConversion = require('../controllers/unitConversion');
const { scheduleDailyLog } = require('../controllers/dailyUsage');
const {
  scheduleDailyBackup,
  setBackupDir,
  setBackupRetention,
  applySchema,
  applyMigrations,
} = require('../controllers/dbBackup');
const accessControl = require('../controllers/accessControl');
const config = require('../config');

async function startServer(server, db) {
  await new Promise((resolve, reject) =>
    applySchema((e) => (e ? reject(e) : resolve()))
  );
  await new Promise((resolve, reject) =>
    applyMigrations(db, (e) => (e ? reject(e) : resolve()))
  );
  await accessControl.ensureDefaults(db);
  await Promise.all([
    new Promise((resolve, reject) =>
      settingsCache.loadSettings(db, (e) => (e ? reject(e) : resolve()))
    ),
    new Promise((resolve, reject) =>
      unitConversion.loadUnits(db, (e) => (e ? reject(e) : resolve()))
    ),
    accessControl.loadHierarchy(db),
    accessControl.loadPermissions(db),
  ]);
  const settings = settingsCache.getSettings();
  if (settings.backup_dir) setBackupDir(settings.backup_dir);
  if (settings.backup_retention_days)
    setBackupRetention(settings.backup_retention_days);
  scheduleDailyLog(db);
  scheduleDailyBackup(db);
  const PORT = config.port;
  await new Promise((resolve) => {
    server.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

module.exports = { startServer };
