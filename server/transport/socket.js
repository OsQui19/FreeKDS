const { Server } = require('socket.io');
const setupSocketHandlers = require('../controllers/socketHandlers');

const ALLOWED_ORIGINS = ['*'];
const VALID_TOKEN = process.env.REALTIME_TOKEN || 'devtoken';

function initSocket(server, db, transports) {
  const io = new Server(server, {
    cors: { origin: (origin, cb) => cb(null, true), credentials: false },
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
