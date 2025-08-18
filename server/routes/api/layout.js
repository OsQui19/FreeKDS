const express = require('express');
const Ajv = require('ajv');
const layoutSchema = require('../../../schemas/layout.schema.json');
const { query } = require('../../../utils/db');

delete layoutSchema.$schema; // remove unsupported draft marker for Ajv v6
const ajv = new Ajv({ allErrors: true });
const validateLayout = ajv.compile(layoutSchema);

module.exports = (db) => {
  const router = express.Router();

  router.get('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const name = req.query.name || 'default';
    try {
      const [rows] = await query(db, 'SELECT definition FROM layouts WHERE name=?', [name]);
      const layout = rows.length ? rows[0].definition : null;
      res.json({ layout });
    } catch (err) {
      next(err);
    }
  });

  router.post('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const { name = 'default', layout } = req.body || {};
    if (typeof layout !== 'string') return res.status(400).send('Invalid layout');

    let layoutObj;
    try {
      layoutObj = JSON.parse(layout);
    } catch (err) {
      return res.status(400).json({ errors: ['Invalid JSON'] });
    }

    if (!validateLayout(layoutObj)) {
      return res.status(400).json({ errors: validateLayout.errors });
    }

    try {
      await query(
        db,
        'INSERT INTO layouts (name, definition) VALUES (?, ?) ON DUPLICATE KEY UPDATE definition=VALUES(definition)',
        [name, layout],
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
