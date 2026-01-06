const express = require('express');
const { query } = require('../../../utils/db');
const schemaValidator = require('../../middleware/schemaValidator');

module.exports = (db) => {
  const router = express.Router();

  router.get('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const name = req.query.name || 'default';
    const stationId = req.query.stationId;
    try {
      let rows;
      if (stationId) {
        [rows] = await query(db, 'SELECT definition FROM screen_definitions WHERE station_id=?', [stationId]);
      } else {
        [rows] = await query(db, 'SELECT definition FROM layouts WHERE name=?', [name]);
      }
      const layout = rows.length ? rows[0].definition : null;
      res.json({ layout });
    } catch (err) {
      next(err);
    }
  });

  // Draft endpoints for WYSIWYG publishing workflow
  router.get('/layout/draft', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const name = req.query.name || 'default';
    try {
      const [rows] = await query(db, 'SELECT definition, updated_at FROM layout_drafts WHERE name=?', [name]);
      res.json({ draft: rows.length ? rows[0].definition : null, updated_at: rows.length ? rows[0].updated_at : null });
    } catch (err) { next(err); }
  });

  router.post('/layout/draft', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const name = (req.body && req.body.name) || 'default';
    const layout = (req.body && req.body.layout) || null;
    if (typeof layout !== 'string') return res.status(400).json({ error: 'Invalid layout' });
    try {
      await query(db, 'INSERT INTO layout_drafts (name, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)', [name, layout]);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  router.post('/layout/publish', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const name = (req.body && req.body.name) || 'default';
    try {
      const [rows] = await query(db, 'SELECT definition FROM layout_drafts WHERE name=?', [name]);
      if (!rows.length) return res.status(404).json({ error: 'No draft' });
      const layout = rows[0].definition;
      // Snapshot current layout to versions
      const [prev] = await query(db, 'SELECT definition FROM layouts WHERE name=?', [name]);
      if (prev.length) await query(db, 'INSERT INTO layout_versions (name, definition) VALUES (?, ?)', [name, prev[0].definition]);
      await query(db, 'INSERT INTO layouts (name, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)', [name, layout]);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // List saved layout names
  router.get('/layout/names', async (req, res, next) => {
    try {
      const [rows] = await query(db, 'SELECT name FROM layouts ORDER BY name');
      res.json({ names: rows.map((r) => r.name) });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/layout',
    (req, res, next) => {
      if (!req.session.user) return res.status(401).send('Unauthorized');
      const { layout } = req.body || {};
      if (typeof layout !== 'string')
        return res.status(400).json({ errors: ['Invalid layout'] });
      try {
        req.layoutObj = JSON.parse(layout);
        next();
      } catch (err) {
        return res.status(400).json({ errors: ['Invalid JSON'] });
      }
    },
    schemaValidator(
      (req) => (req.body && req.body.stationId ? 'screen' : 'layout'),
      (req) => req.layoutObj,
    ),
    async (req, res, next) => {
      const { name = 'default', layout, stationId } = req.body || {};
      try {
        // Save a version snapshot before updating
        if (!stationId) {
          const [prev] = await query(db, 'SELECT definition FROM layouts WHERE name=?', [name]);
          if (prev.length) {
            await query(db, 'INSERT INTO layout_versions (name, definition) VALUES (?, ?)', [name, prev[0].definition]);
          }
        }
        if (stationId) {
          await query(
            db,
            'INSERT INTO screen_definitions (station_id, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)',
            [stationId, layout],
          );
        } else {
          await query(
            db,
            'INSERT INTO layouts (name, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)',
            [name, layout],
          );
        }
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // Delete a named layout
  router.delete('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const name = (req.query.name || req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
      await query(db, 'DELETE FROM layouts WHERE name=?', [name]);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/layout/versions', async (req, res, next) => {
    const name = req.query.name || 'default';
    try {
      const [rows] = await query(db, 'SELECT id, name, created_at FROM layout_versions WHERE name=? ORDER BY created_at DESC LIMIT 50', [name]);
      res.json({ versions: rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/layout/restore', async (req, res, next) => {
    const id = parseInt(req.body.id, 10);
    const name = req.body.name || 'default';
    if (!id) return res.status(400).send('Invalid id');
    try {
      const [rows] = await query(db, 'SELECT definition FROM layout_versions WHERE id=?', [id]);
      if (!rows.length) return res.status(404).send('Not found');
      const definition = rows[0].definition;
      await query(db, 'INSERT INTO layouts (name, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)', [name, definition]);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
