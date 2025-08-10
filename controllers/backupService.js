const {
  listBackups,
  restoreDatabase,
  backupDatabase,
  isBackupRunning,
  getBackupStatus,
  deleteBackup,
  getBackupDir,
  setBackupDir,
  getBackupRetention,
  setBackupRetention,
} = require('./dbBackup');

module.exports = {
  listBackups,
  restoreDatabase,
  backupDatabase,
  isBackupRunning,
  getBackupStatus,
  deleteBackup,
  getBackupDir,
  setBackupDir,
  getBackupRetention,
  setBackupRetention,
};
