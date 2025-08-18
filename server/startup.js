const logger = require('../utils/logger');
const settingsCache = require('./controllers/settingsCache');
const unitConversion = require('./controllers/unitConversion');
const { scheduleDailyLog } = require('./controllers/dailyUsage');
const {
  scheduleDailyBackup,
  setBackupDir,
  setBackupRetention,
  applySchema,
  applyMigrations,
} = require('./controllers/dbBackup');
const accessControl = require('./controllers/accessControl');
const { loadPluginManifests } = require('./controllers/pluginLoader');
const config = require('../config');

async function startServer(server, db) {
  const [tables] = await db
    .promise()
    .query("SHOW TABLES LIKE 'settings'");
  if (tables.length === 0) {
    await new Promise((resolve, reject) =>
      applySchema((e) => (e ? reject(e) : resolve()))
    );
  }
  await new Promise((resolve, reject) =>
    applyMigrations(db, (e) => (e ? reject(e) : resolve()))
  );
  await accessControl.ensureDefaults(db);
  await Promise.all([
    settingsCache.loadSettings(db),
    unitConversion.loadUnits(db),
    accessControl.loadHierarchy(db),
    accessControl.loadPermissions(db),
    loadPluginManifests(),
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
