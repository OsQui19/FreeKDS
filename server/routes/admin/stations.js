const express = require('express');
const logger = require('../../../utils/logger');
const accessControl = require('../../controllers/accessControl');

module.exports = (db) => {
  const router = express.Router();

  // Create or update a station
  router.post('/admin/stations', async (req, res) => {
    const role = req.session?.user?.role;
    if (!role || !accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).send('Forbidden');
    }
    const id = req.body.id ? parseInt(req.body.id, 10) : null;
    const name = (req.body.name || '').trim();
    const type = (req.body.type || '').trim() || 'prep';
    const orderTypeFilter = (req.body.order_type_filter || '').trim() || null;
    const nextStationId = req.body.next_station_id ? parseInt(req.body.next_station_id, 10) : null;
    const bgColor = (req.body.bg_color || '').trim() || null;
    const primaryColor = (req.body.primary_color || '').trim() || null;
    const fontFamily = (req.body.font_family || '').trim() || null;
    if (!name) return res.status(400).send('Name required');
    try {
      if (id) {
        await db
          .promise()
          .query(
            'UPDATE stations SET name=?, type=?, order_type_filter=?, bg_color=?, primary_color=?, font_family=?, next_station_id=? WHERE id=?',
            [name, type, orderTypeFilter, bgColor, primaryColor, fontFamily, nextStationId, id]
          );
          return res.json({ success: true, id });
        } else {
          const [result] = await db
            .promise()
            .query(
            'INSERT INTO stations (name, type, order_type_filter, bg_color, primary_color, font_family, next_station_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, type, orderTypeFilter, bgColor, primaryColor, fontFamily, nextStationId]
          );
          return res.json({ success: true, id: result.insertId });
        }
    } catch (err) {
      logger.error('Error saving station:', err);
      res.status(500).send('Server Error');
    }
  });

  router.delete('/admin/stations/:id', async (req, res) => {
    const role = req.session?.user?.role;
    if (!role || !accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).send('Forbidden');
    }
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).send('Invalid id');
    try {
      await db.promise().query('DELETE FROM stations WHERE id=?', [id]);
      res.json({ success: true });
    } catch (err) {
      logger.error('Error deleting station:', err);
      res.status(500).send('Server Error');
    }
  });

  return router;
};
