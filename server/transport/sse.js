const clients = new Map();
const HEARTBEAT_MS = 30000;
const VALID_TOKEN = process.env.REALTIME_TOKEN || 'devtoken';
const config = require('../../config');
const settingsCache = require('../controllers/settingsCache');

function parseAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS;
  if (env && env.trim()) {
    if (env.trim() === '*' || env.split(',').map((s)=>s.trim()).includes('*')) return ['*'];
    return env.split(',').map((s)=>s.trim()).filter(Boolean);
  }
  const fromConfig = (config && config.cors && Array.isArray(config.cors.allowedOrigins) ? config.cors.allowedOrigins : []) || [];
  if (fromConfig.length) return fromConfig;
  try {
    const settings = settingsCache.getSettings() || {};
    let s = settings.allowed_origins;
    if (typeof s === 'string' && s.trim()) {
      if (s.trim().startsWith('[')) {
        try { const arr = JSON.parse(s); if (Array.isArray(arr) && arr.length) return arr; } catch {}
      }
      const list = s.split(',').map((v)=>v.trim()).filter(Boolean);
      if (list.length) return list;
    }
  } catch {}
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'http://127.0.0.1',
  ];
}

function initSSE(app) {
  app.get('/sse', (req, res) => {
    // Optional origin enforcement similar to Socket.IO CORS
    const origins = parseAllowedOrigins();
    const allowAll = origins.includes('*');
    const allowed = new Set(origins);
    const origin = (req.headers && req.headers.origin ? String(req.headers.origin).toLowerCase() : '');
    if (origin && !allowAll && !allowed.has(origin)) {
      res.status(403).end();
      return;
    }
    const stationId = parseInt(req.query.stationId, 10);
    const type = (req.query.type || '').toLowerCase();
    const token = req.query.token;
    if (token !== VALID_TOKEN) {
      res.status(401).end();
      return;
    }
    if (isNaN(stationId)) {
      res.status(400).end();
      return;
    }
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...(origin && allowAll ? { 'Access-Control-Allow-Origin': '*' } : {}),
      ...(origin && !allowAll ? { 'Access-Control-Allow-Origin': origin } : {}),
    });
    res.flushHeaders && res.flushHeaders();
    clients.set(stationId, { res, type });
    req.on('close', () => {
      clients.delete(stationId);
    });
  });

  function send(res, event, data) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // Failed to write to client; ignore
    }
  }

  setInterval(() => {
    for (const { res } of clients.values()) {
      send(res, 'ping', Date.now());
    }
  }, HEARTBEAT_MS);

  return {
    emitToStation(id, event, data) {
      const client = clients.get(Number(id));
      if (client) send(client.res, event, data);
    },
    emitToExpo(event, data) {
      for (const { res, type } of clients.values()) {
        if (type === 'expo') send(res, event, data);
      }
    },
    emitAll(event, data) {
      for (const { res } of clients.values()) {
        send(res, event, data);
      }
    },
    clientCount() {
      return clients.size;
    },
  };
}

module.exports = initSSE;
