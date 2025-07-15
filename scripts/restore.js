const logger = require('../utils/logger');
const path = require('path');
const { restoreDatabase } = require('../controllers/dbBackup');

const file = process.argv[2];
if (!file) {
  logger.error('Usage: node scripts/restore.js <backup-file.sql>');
  process.exit(1);
}
const fullPath = path.resolve(file);
restoreDatabase(fullPath, (err) => {
  if (err) process.exit(1);
});
