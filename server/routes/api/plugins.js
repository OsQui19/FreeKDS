const express = require('express');
const { getManifests } = require('../../controllers/pluginLoader');

const router = express.Router();

router.get('/plugins', (req, res) => {
  try {
    const list = (getManifests() || []).map((m) => ({
      id: m.id,
      name: m.name,
      version: m.version,
      dir: m.dir,
      main: m.main,
      route: m.route,
      zone: m.zone,
      contributes: m.contributes || {},
    }));
    res.json({ plugins: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load plugins' });
  }
});

module.exports = router;

