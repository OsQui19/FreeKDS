const express = require('express');
const accessControl = require('../../controllers/accessControl');
const logger = require('../../../utils/logger');

module.exports = (db) => {
  const router = express.Router();

  router.get('/admin/station-categories', async (req, res) => {
    const role = req.session?.user?.role;
    if (!role || !accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const stationId = parseInt(req.query.station_id, 10);
    if (!stationId) return res.status(400).json({ error: 'Invalid station_id' });
    try {
      const [rows] = await db
        .promise()
        .query('SELECT category_id FROM station_categories WHERE station_id=?', [stationId]);
      res.json({ station_id: stationId, category_ids: rows.map((r) => r.category_id) });
    } catch (err) {
      logger.error('Error loading station categories:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  });

  router.post('/admin/station-categories', async (req, res) => {
    const role = req.session?.user?.role;
    if (!role || !accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const stationId = parseInt(req.body.station_id, 10);
    let ids = req.body.category_ids;
    if (!stationId) return res.status(400).json({ error: 'Invalid station_id' });
    if (typeof ids === 'string') ids = ids.split(',').map((s) => s.trim()).filter(Boolean);
    const arr = Array.isArray(ids) ? ids.map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n)) : [];
    try {
      await db.promise().query('DELETE FROM station_categories WHERE station_id=?', [stationId]);
      if (arr.length) {
        const values = arr.map((cid) => [stationId, cid]);
        await db.promise().query('INSERT INTO station_categories (station_id, category_id) VALUES ?', [values]);
      }
      res.json({ success: true, station_id: stationId, category_ids: arr });
    } catch (err) {
      logger.error('Error saving station categories:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  });

  return router;
};

