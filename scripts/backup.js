require('../utils/logger');
const { backupDatabase } = require('../controllers/dbBackup');

backupDatabase((err) => {
  if (err) process.exit(1);
});
