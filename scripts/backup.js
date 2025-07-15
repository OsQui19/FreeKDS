require('../utils/logger');
const { backupDatabase } = require('../controllers/dbBackup');

backupDatabase((err) => {
  if (!err) return;
  if (err.deleteFailed) {
    process.exit(2);
  }
  process.exit(1);
});
