const { Server } = require('socket.io');
const setupSocketHandlers = require('../controllers/socketHandlers');
const config = require('../../config');
const settingsCache = require('../controllers/settingsCache');

const VALID_TOKEN = process.env.REALTIME_TOKEN || 'devtoken';

function parseAllowedOrigins() {
  // Prefer env var, then config.cors.allowedOrigins, then safe localhost defaults
  const env = process.env.ALLOWED_ORIGINS;
  if (env && env.trim()) {
    if (env.trim() === '*' || env.split(',').map((s)=>s.trim()).includes('*')) {
      return ['*'];
    }
    return env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const fromConfig =
    (config && config.cors && Array.isArray(config.cors.allowedOrigins)
      ? config.cors.allowedOrigins
      : null) || [];
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

function initSocket(server, db, transports) {
  const origins = parseAllowedOrigins();
  const allowAll = origins.includes('*');
  const allowed = new Set(origins);
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        // Allow no Origin (e.g., non-browser clients)
        if (!origin) return cb(null, true);
        if (allowAll) return cb(null, true);
        try {
          const o = String(origin).toLowerCase();
          if (allowed.has(o)) return cb(null, true);
        } catch {}
        cb(new Error('Origin not allowed'));
      },
      credentials: false,
    },
  });

  io.use((socket, next) => {
    const { token } = socket.handshake.query;
    if (token !== VALID_TOKEN) return next(new Error('Unauthorized'));
    next();
  });

  setupSocketHandlers(io, db, transports);
  return io;
}

module.exports = initSocket;
