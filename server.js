const http = require('http');
const mysql = require('mysql2');
const config = require('./config');
const logger = require('./utils/logger');
const createApp = require('./src/app');
const initSocket = require('./src/socket');
const { startServer } = require('./src/startup');

const db = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  port: config.db.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    logger.error('Database connection error:', err);
    process.exit(1);
  }
  if (connection) connection.release();
  const server = http.createServer();
  const io = initSocket(server, db);
  const app = createApp(db, io);
  server.on('request', app);
  startServer(server, db).catch((e) => {
    logger.error('Startup error:', e);
    process.exit(1);
  });
});
