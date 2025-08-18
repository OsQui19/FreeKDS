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

  return router;
};
