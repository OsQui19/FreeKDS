const mysql = require('mysql2');
const config = require('../config');
const logger = require('../utils/logger');

function connect() {
  const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        logger.error('Database connection error:', err);
        reject(err);
      } else {
        if (connection) connection.release();
        resolve(pool);
      }
    });
  });
}

module.exports = { connect };
