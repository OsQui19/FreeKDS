const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const accessControl = require('../../controllers/accessControl');

module.exports = (db) => {
  const router = express.Router();

  router.get('/api-tokens', async (req, res) => {
    const topRole = accessControl.getHierarchy().slice(-1)[0];
    if (!req.session.user || !accessControl.hasLevel(req.session.user.role, topRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [rows] = await db
      .promise()
      .query('SELECT id, token_id, name, scopes, station_id, created_at, last_used, expires_at, revoked FROM api_tokens ORDER BY created_at DESC');
    res.json({ tokens: rows });
  });

  router.post('/api-tokens', async (req, res) => {
    const topRole = accessControl.getHierarchy().slice(-1)[0];
    if (!req.session.user || !accessControl.hasLevel(req.session.user.role, topRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const name = (req.body.name || '').trim() || 'Token';
    const scopes = Array.isArray(req.body.scopes) ? req.body.scopes : [];
    const stationId = req.body.station_id || null;
    const tokenId = crypto.randomUUID();
    const secret = crypto.randomBytes(24).toString('base64url');
    const secretHash = await bcrypt.hash(secret, 10);
    await db
      .promise()
      .query(
        'INSERT INTO api_tokens (token_id, name, secret_hash, scopes, station_id) VALUES (?, ?, ?, ?, ?)',
        [tokenId, name, secretHash, JSON.stringify(scopes), stationId]
      );
    res.json({ token: `${tokenId}.${secret}`, token_id: tokenId, name, scopes, station_id: stationId });
  });

  router.delete('/api-tokens/:id', async (req, res) => {
    const topRole = accessControl.getHierarchy().slice(-1)[0];
    if (!req.session.user || !accessControl.hasLevel(req.session.user.role, topRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await db.promise().query('UPDATE api_tokens SET revoked=1 WHERE id=?', [id]);
    res.json({ success: true });
  });

  return router;
};

