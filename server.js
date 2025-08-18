const http = require('http');
const logger = require('./utils/logger');
const createApp = require('./server/app');
const initSocket = require('./server/socket');
const { connect } = require('./server/database');
const { startServer } = require('./server/startup');

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
