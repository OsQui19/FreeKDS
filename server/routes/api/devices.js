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

  function genCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  router.post('/devices/pair/start', async (req, res) => {
    const role = req.session?.user?.role;
    if (!role || !accessControl.roleHasAccess(role, 'stations')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const stationId = parseInt(req.body.station_id, 10);
    const name = (req.body.name || '').trim() || 'Device';
    if (!stationId) return res.status(400).json({ error: 'station_id required' });
    try {
      const code = genCode();
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      await db
        .promise()
        .query('INSERT INTO device_pair_codes (code, station_id, name, expires_at) VALUES (?, ?, ?, ?)', [code, stationId, name, expires]);
      res.json({ code, expires_at: expires.toISOString() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create pair code' });
    }
  });

  router.post('/devices/pair/complete', async (req, res) => {
    const code = (req.body.code || '').trim();
    if (!code) return res.status(400).json({ error: 'code required' });
    try {
      const [rows] = await db
        .promise()
        .query('SELECT * FROM device_pair_codes WHERE code=? AND used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())', [code]);
      if (!rows.length) return res.status(400).json({ error: 'invalid or expired code' });
      const rec = rows[0];
      // Create API token for this device
      const name = rec.name || `Device ${rec.id}`;
      const scopes = ['kds:read', 'orders:read'];
      const tokenId = require('crypto').randomUUID();
      const secret = require('crypto').randomBytes(24).toString('base64url');
      const bcrypt = require('bcrypt');
      const secretHash = await bcrypt.hash(secret, 10);
      await db
        .promise()
        .query(
          'INSERT INTO api_tokens (token_id, name, secret_hash, scopes, station_id) VALUES (?, ?, ?, ?, ?)',
          [tokenId, name, secretHash, JSON.stringify(scopes), rec.station_id]
        );
      await db.promise().query('UPDATE device_pair_codes SET used_at=NOW() WHERE id=?', [rec.id]);
      res.json({ token: `${tokenId}.${secret}`, station_id: rec.station_id, name });
    } catch (err) {
      res.status(500).json({ error: 'Failed to complete pairing' });
    }
  });

  return router;
};
