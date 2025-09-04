const express = require('express');
const accessControl = require('../../controllers/accessControl');
const menuDb = require('../../controllers/db/menu');

module.exports = (db) => {
  const router = express.Router();

  router.get('/devices', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const role = req.session.user.role;
    if (!accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const [stations, [printers]] = await Promise.all([
        menuDb.getStations(db),
        db.promise().query('SELECT * FROM printers ORDER BY name'),
      ]);
      res.json({ stations, printers });
    } catch (err) {
      res.status(500).json({ error: 'Server Error' });
    }
  });

  router.post('/printers', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const role = req.session.user.role;
    if (!accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = req.body.id ? parseInt(req.body.id, 10) : null;
    const name = (req.body.name || '').trim();
    const type = (req.body.type || 'network').trim();
    const address = (req.body.address || '').trim();
    const profile = (req.body.profile || '80mm').trim();
    const stationId = req.body.station_id ? parseInt(req.body.station_id, 10) : null;
    const isEnabled = req.body.is_enabled != null ? (req.body.is_enabled ? 1 : 0) : 1;
    if (!name || !address) return res.status(400).json({ error: 'Name and address are required' });
    try {
      if (id) {
        await db
          .promise()
          .query(
            'UPDATE printers SET name=?, type=?, address=?, profile=?, station_id=?, is_enabled=? WHERE id=?',
            [name, type, address, profile, stationId, isEnabled, id]
          );
      } else {
        await db
          .promise()
          .query(
            'INSERT INTO printers (name, type, address, profile, station_id, is_enabled) VALUES (?, ?, ?, ?, ?, ?)',
            [name, type, address, profile, stationId, isEnabled]
          );
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server Error' });
    }
  });

  router.delete('/printers/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const role = req.session.user.role;
    if (!accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
      await db.promise().query('DELETE FROM printers WHERE id=?', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server Error' });
    }
  });

  return router;
};

