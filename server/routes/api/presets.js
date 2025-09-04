const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../../../utils/db');

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ name: path.basename(f, '.json'), file: f }));
}

module.exports = (db) => {
  const router = express.Router();
  const tokensDir = path.join(__dirname, '..', '..', '..', 'tokens', 'presets');
  const layoutsDir = path.join(__dirname, '..', '..', '..', 'layouts', 'presets');

  router.get('/presets/tokens', (req, res) => {
    const presets = listJson(tokensDir);
    res.json({ presets });
  });

  router.get('/presets/layouts', (req, res) => {
    const presets = listJson(layoutsDir).map((p) => {
      // infer page from filename prefix
      const n = p.name;
      let page = 'pos';
      if (n.includes('kds-prep')) page = 'kds-prep';
      else if (n.includes('kds-expo')) page = 'kds-expo';
      else if (n.includes('pos')) page = 'pos';
      return { ...p, page };
    });
    res.json({ presets });
  });

  router.post('/presets/tokens/apply', express.json(), (req, res, next) => {
    const { name, scope = 'global', stationId, screenId } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const file = path.join(tokensDir, `${name}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'preset not found' });
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      // Write to tokens directory similar to /api/tokens route
      const tokensBase = path.join(__dirname, '..', '..', '..', 'tokens');
      let targetPath = path.join(tokensBase, 'base.json');
      if (scope === 'station' && stationId) targetPath = path.join(tokensBase, 'stations', `${stationId}.json`);
      if (scope === 'screen' && screenId) targetPath = path.join(tokensBase, 'screens', `${screenId}.json`);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, JSON.stringify(content, null, 2), 'utf-8');
      res.json({ success: true, path: targetPath });
    } catch (err) {
      next(err);
    }
  });

  router.post('/presets/layouts/apply', express.json(), async (req, res, next) => {
    const { name, page = 'pos' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
      const file = path.join(layoutsDir, `${name}.json`);
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'preset not found' });
      const layout = fs.readFileSync(file, 'utf-8');
      const layoutName = page === 'pos' ? 'page-pos' : page === 'kds-prep' ? 'kds-prep' : page === 'kds-expo' ? 'kds-expo' : `page-${page}`;
      await query(db, 'INSERT INTO layouts (name, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)', [layoutName, layout]);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};

