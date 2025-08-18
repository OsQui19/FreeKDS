const express = require('express');
<<<<<<< ours
const validators = require('../../../schemas/validate');
const { query } = require('../../../utils/db');

const validateLayout = validators.layout;
=======
const Ajv = require('ajv');
const layoutSchema = require('../../../schemas/layout.schema@1.0.0.json');
const layoutBlockSchema = require('../../../schemas/layout-block.schema@1.0.0.json');
const screenSchema = require('../../../schemas/screen.schema@1.0.0.json');
const { query } = require('../../../utils/db');

delete layoutSchema.$schema; // remove unsupported draft marker for Ajv v6
delete layoutBlockSchema.$schema;
delete screenSchema.$schema;
const ajv = new Ajv({ allErrors: true });
ajv.addSchema(layoutBlockSchema);
const validateLayout = ajv.compile(layoutSchema);
const validateScreen = ajv.compile(screenSchema);
>>>>>>> theirs

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

  router.post('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const { name = 'default', layout, stationId } = req.body || {};
    if (typeof layout !== 'string') return res.status(400).send('Invalid layout');

    let layoutObj;
    try {
      layoutObj = JSON.parse(layout);
    } catch (err) {
      return res.status(400).json({ errors: ['Invalid JSON'] });
    }

    if (stationId) {
      if (!validateScreen(layoutObj)) {
        return res.status(400).json({ errors: validateScreen.errors });
      }
    } else if (!validateLayout(layoutObj)) {
      return res.status(400).json({ errors: validateLayout.errors });
    }

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
  });

  return router;
};
