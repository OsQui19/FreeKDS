const express = require("express");
const logger = require("../../utils/logger");
const path = require("path");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const upload = multer({ dest: os.tmpdir() });
const {
  listBackups,
  restoreDatabase,
  backupDatabase,
  isBackupRunning,
  getBackupStatus,
  deleteBackup,
  getBackupDir,
  setBackupDir,
  setBackupRetention,
} = require("../../controllers/dbBackup");
const settingsCache = require("../../controllers/settingsCache");

module.exports = (db) => {
  const router = express.Router();

  router.get("/admin/backups", (req, res) => {
    res.redirect("/admin?tab=backup");
  });

  router.post("/admin/backups/create", (req, res) => {
    const alreadyRunning = isBackupRunning();
    backupDatabase(db, (err) => {
      if (err && err.message !== "Backup already running") {
        logger.error("Backup failed:", err);
        return res.status(500).json({ error: "Backup failed" });
      }
      res.json({ running: alreadyRunning || isBackupRunning() });
    });
  });

  router.get("/admin/backups/status", (req, res) => {
    res.json(getBackupStatus());
  });

  router.get("/admin/backups/list", (req, res) => {
    res.json({ backups: listBackups() });
  });

  router.get("/admin/backups/log", async (req, res) => {
    try {
      const logPath = path.join(getBackupDir(), "backup.log");
      const data = await fs.promises.readFile(logPath, "utf8");
      res.type("text/plain").send(data);
    } catch (err) {
      logger.error("Error fetching backup log:", err);
      res.status(500).send("Failed");
    }
  });

  router.post("/admin/backups/restore", (req, res) => {
    const file = req.body.file;
    if (!file) return res.redirect("/admin/backups");
    restoreDatabase(db, file, (err) => {
      if (err) {
        logger.error("Restore failed:", err);
        return res.redirect("/admin/backups?err=Restore+failed");
      }
      res.redirect("/admin/backups?msg=Restore+complete");
    });
  });

  router.post("/admin/backups/upload", upload.single("backup"), (req, res) => {
    if (!req.file) return res.redirect("/admin/backups");
    const dest = path.join(getBackupDir(), path.basename(req.file.originalname));
    fs.rename(req.file.path, dest, (err) => {
      if (err) {
        logger.error("Error saving uploaded backup:", err);
        return res.redirect("/admin/backups?err=Upload+failed");
      }
      res.redirect("/admin/backups?msg=Backup+uploaded");
    });
  });

  router.get("/admin/backups/download", (req, res) => {
    const file = req.query.file;
    if (!file) return res.status(400).send("No file");
    const fullPath = path.join(getBackupDir(), file);
    res.download(fullPath);
  });

  router.post("/admin/backups/delete", (req, res) => {
    const file = req.body.file;
    if (!file) return res.redirect("/admin/backups");
    try {
      deleteBackup(file);
      res.redirect("/admin/backups?msg=Backup+deleted");
    } catch (err) {
      logger.error("Error deleting backup:", err);
      res.redirect("/admin/backups?err=Delete+failed");
    }
  });

  router.get("/admin/backups/browse", (req, res) => {
    const dir = getBackupDir();
    fs.readdir(dir, (err, files) => {
      if (err) {
        logger.error("Error browsing backups:", err);
        return res.status(500).send("Failed");
      }
      res.json({ files });
    });
  });

  router.post("/admin/backups/set-dir", async (req, res) => {
    const dir = (req.body.dir || "").trim();
    if (!dir) return res.redirect("/admin?tab=backup");
    try {
      await db
        .promise()
        .query(
          "INSERT INTO settings (setting_key, setting_value) VALUES ('backup_dir', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [dir],
        );
      setBackupDir(dir);
      settingsCache.loadSettings(db);
      res.redirect("/admin/backups?msg=Location+saved");
    } catch (err) {
      logger.error("Error saving backup dir:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/backups/set-retention", async (req, res) => {
    const days = parseInt(req.body.days, 10);
    if (!Number.isInteger(days) || days <= 0) {
      return res.redirect("/admin?tab=backup");
    }
    try {
      await db
        .promise()
        .query(
          "INSERT INTO settings (setting_key, setting_value) VALUES ('backup_retention_days', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [days],
        );
      setBackupRetention(days);
      settingsCache.loadSettings(db);
      res.redirect("/admin/backups?msg=Retention+saved");
    } catch (err) {
      logger.error("Error saving backup retention:", err);
      res.status(500).send("DB Error");
    }
  });

  return router;
};

