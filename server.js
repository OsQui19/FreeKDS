const http = require('http');
const logger = require('./utils/logger');
const createApp = require('./src/app');
const initSocket = require('./src/socket');
const { connect } = require('./src/database');
const { startServer } = require('./src/startup');

connect()
  .then((db) => {
    const server = http.createServer();
    const io = initSocket(server, db);
    const app = createApp(db, io);
    server.on('request', app);
    return startServer(server, db);
  })
  .catch((err) => {
    logger.error('Startup error:', err);
    process.exit(1);
  });
