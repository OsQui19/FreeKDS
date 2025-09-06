const express = require('express');
const { query } = require('../../../utils/db');
const settingsCache = require('../../controllers/settingsCache');

module.exports = (db) => {
  const router = express.Router();

  router.get('/settings', async (req, res) => {
    try {
      const settings = settingsCache.getSettings();
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  router.post('/settings', express.json(), async (req, res) => {
    const body = req.body || {};
    const entries = Object.entries(body);
    if (!entries.length) return res.status(400).json({ error: 'No settings provided' });
    try {
      for (const [key, val] of entries) {
        await query(
          db,
          "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
          [key, typeof val === 'string' ? val : JSON.stringify(val)]
        );
      }
      await settingsCache.loadSettings(db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  return router;
};

