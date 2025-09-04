const crypto = require('crypto');
const bcrypt = require('bcrypt');

module.exports = function apiTokenAuth(db, logger) {
  return async (req, res, next) => {
    try {
      const hdr = req.headers['authorization'] || '';
      const m = hdr.match(/^Bearer\s+(.+)$/i);
      if (!m) return next();
      const token = m[1];
      // token format: token_id.secret
      const parts = token.split('.');
      if (parts.length !== 2) return next();
      const [tokenId, secret] = parts;
      const [rows] = await db.promise().query('SELECT * FROM api_tokens WHERE token_id=? AND revoked=0', [tokenId]);
      if (!rows.length) return next();
      const rec = rows[0];
      if (rec.expires_at && new Date(rec.expires_at) < new Date()) return next();
      const ok = await bcrypt.compare(secret, rec.secret_hash);
      if (!ok) return next();
      // Attach to request
      req.apiToken = {
        id: rec.id,
        tokenId: rec.token_id,
        name: rec.name,
        stationId: rec.station_id,
        scopes: (() => { try { return JSON.parse(rec.scopes || '[]'); } catch { return []; } })(),
      };
      // Optionally synthesize a minimal user for RBAC checks with limited privileges
      req.session = req.session || {};
      req.session.user = req.session.user || { role: 'service', name: rec.name };
      // Update last_used async (fire and forget)
      db.promise().query('UPDATE api_tokens SET last_used=NOW() WHERE id=?', [rec.id]).catch(() => {});
      return next();
    } catch (err) {
      if (logger) logger.error('apiTokenAuth error', err);
      return next();
    }
  };
};

