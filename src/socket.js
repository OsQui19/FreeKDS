const { Server } = require('socket.io');
const setupSocketHandlers = require('../controllers/socketHandlers');

function initSocket(server, db) {
  const io = new Server(server);
  setupSocketHandlers(io, db);
  return io;
}

module.exports = initSocket;
