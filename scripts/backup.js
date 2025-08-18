const { backupDatabase } = require("../server/controllers/dbBackup");

backupDatabase((err) => {
  if (!err) return;
  if (err.deleteFailed) {
    process.exit(2);
  }
  process.exit(1);
});
