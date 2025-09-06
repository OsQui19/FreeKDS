const crypto = require('crypto');
const fetch = require('node-fetch');
const settingsCache = require('./settingsCache');
const { query } = require('../../utils/db');

async function send(event, payload, db) {
  try {
    const settings = settingsCache.getSettings() || {};
    const url = settings.webhook_url;
    const secret = settings.webhook_secret || '';
    if (!url) return;
    const body = JSON.stringify({ event, payload, timestamp: Date.now() });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const started = Date.now();
    let status = null; let error = null;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': sig, 'X-Event': event }, body });
      status = res.status;
    } catch (e) {
      status = null; error = e.message || String(e);
    }
    const ms = Date.now() - started;
    try {
      if (db) {
        await query(db, 'INSERT INTO webhook_deliveries (event, payload, status_code, response_ms, error) VALUES (?, ?, ?, ?, ?)', [event, body, status, ms, error]);
      }
    } catch {}
  } catch (err) {
    // best-effort: don't crash path
  }
}

module.exports = { send };
