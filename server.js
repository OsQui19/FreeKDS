const http = require('http');
const logger = require('./utils/logger');
const createApp = require('./server/app');
const initSocket = require('./server/transport/socket');
const initSSE = require('./server/transport/sse');
const { connect } = require('./src/database');
const { startServer } = require('./server/startup');

connect()
  .then((db) => {
    const server = http.createServer();
    const transports = {};
    const app = createApp(db, transports);
    const io = initSocket(server, db, transports);
    const sse = initSSE(app);
    Object.assign(transports, { io, sse });
    server.on('request', app);
    return startServer(server, db);
  })
  .catch((err) => {
    logger.error('Startup error:', err);
    process.exit(1);
  });
