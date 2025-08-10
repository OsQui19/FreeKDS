<<<<<<< ours
const express = require("express");
const logger = require("../../utils/logger");
const { convert } = require("../../controllers/unitConversion");
const {
  getIngredients,
  getUnits,
  getPurchaseOrderItems,
  receivePurchaseOrder,
} = require("../../controllers/db/inventory");
const { fetchSalesTotals, fetchIngredientUsage } = require("../../controllers/analytics");
const { getRolePermissions } = require("../../controllers/accessControl");
const itemsRoutes = require("./inventory/items");
const childProc = require("child_process");
const config = require("../../config");
const backupsRoutes = require("./backups");
=======
const express = require('express');
const logger = require('../../utils/logger');
const backupsRoutes = require('./backups');
const itemsRoutes = require('./inventory/items');
const { execSync } = require('child_process');
const config = require('../../config');
>>>>>>> theirs

module.exports = (db, io) => {
  const router = express.Router();

<<<<<<< ours
  router.use("/admin/ingredients", itemsRoutes(db));
  router.use(backupsRoutes(db));

  router.get("/admin/updates/latest", async (req, res) => {
    try {
      const repo = config.githubRepo;
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
      const resp = await fetch(url);
      if (!resp.ok) {
        await resp.json().catch(() => ({}));
        return res.status(resp.status).json({ error: 'Fetch failed' });
      }
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      logger.error("Error fetching latest release", err);
      res.status(500).json({ error: "Failed to fetch" });
    }
  });

  router.post("/admin/updates/apply", (req, res) => {
    const user = req.session.user;
    if (!user || (user.role || '').toLowerCase() !== 'management') {
      return res.sendStatus(403);
    }
    try {
      const status = childProc.execSync('git status --porcelain').toString().trim();
      if (status) return res.status(400).json({ error: 'Repo dirty' });
      childProc.execSync('git pull');
      res.json({ success: true });
    } catch (err) {
      logger.error('Error applying update', err);
      res.status(500).json({ error: 'Update failed' });
    }
  });
=======
  router.use('/', backupsRoutes(db));
  router.use('/admin/ingredients', itemsRoutes(db));
>>>>>>> theirs

  router.get('/admin/updates/latest', async (req, res) => {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${config.githubRepo}/releases/latest`,
      );
      if (!resp.ok) {
        return res
          .status(resp.status || 500)
          .json({ error: 'Failed to fetch release info' });
      }
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      logger.error('Error fetching release info:', err);
      res.status(500).json({ error: 'Failed to fetch release info' });
    }
  });

  router.post('/admin/updates/apply', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'management') {
      return res.status(403).send('Forbidden');
    }
    try {
      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
      }).trim();
      if (status) return res.status(400).send('Repo dirty');
      execSync('git pull', { stdio: 'ignore' });
      res.json({ success: true });
    } catch (err) {
      logger.error('Update apply error:', err);
      res.status(500).json({ error: 'Update failed' });
    }
  });

  return router;
};
