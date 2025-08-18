const { Server } = require('socket.io');
const setupSocketHandlers = require('../controllers/socketHandlers');

const ALLOWED_ORIGINS = ['http://localhost:3000'];
const VALID_TOKEN = process.env.REALTIME_TOKEN || 'devtoken';

function initSocket(server, db, transports) {
  const io = new Server(server, {
    cors: { origin: ALLOWED_ORIGINS },
  });

  io.use((socket, next) => {
    const { token } = socket.handshake.query;
    const origin = socket.handshake.headers.origin;
    if (token !== VALID_TOKEN || !ALLOWED_ORIGINS.includes(origin)) {
      return next(new Error('Unauthorized'));
    }
    next();
  });

  setupSocketHandlers(io, db, transports);
  return io;
}

module.exports = initSocket;
