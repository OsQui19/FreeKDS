const { Server } = require('socket.io');
const setupSocketHandlers = require('../controllers/socketHandlers');

function initSocket(server, db, transports) {
  const io = new Server(server);
  setupSocketHandlers(io, db, transports);
  return io;
}

module.exports = initSocket;
