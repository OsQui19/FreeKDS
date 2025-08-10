const express = require("express");
const logger = require("../../utils/logger");
const backupsRoutes = require("./backups");
const itemsRoutes = require("./inventory/items");
const { exec } = require("child_process");
const config = require("../../config");

module.exports = (db, io) => {
  const router = express.Router();

  router.use("/", backupsRoutes(db));
  router.use("/admin/ingredients", itemsRoutes(db));

  router.get("/admin/updates/latest", async (req, res) => {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${config.githubRepo}/releases/latest`,
      );
      if (!resp.ok) {
        return res
          .status(resp.status || 500)
          .json({ error: "Failed to fetch release info" });
      }
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      logger.error("Error fetching release info:", err);
      res.status(500).json({ error: "Failed to fetch release info" });
    }
  });

  router.post("/admin/updates/apply", (req, res) => {
    if (!req.session.user || req.session.user.role !== "management") {
      return res.status(403).send("Forbidden");
    }

    const opts = { timeout: 15000 };

    exec("git status --porcelain", opts, (statusErr, stdout, stderr) => {
      if (statusErr) {
        logger.error("git status error:", statusErr);
        return res.status(500).json({ error: "Update failed" });
      }
      if (stdout.trim()) {
        return res.status(400).send("Repo dirty");
      }

      exec("git pull", opts, (pullErr) => {
        if (pullErr) {
          logger.error("git pull error:", pullErr);
          return res.status(500).json({ error: "Update failed" });
        }
        res.json({ success: true });
      });
    });
  });

  return router;
};

