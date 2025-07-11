const path = require('path');

// Default configuration for local, offline installations
module.exports = {
  db: {
    host: '127.0.0.1',
    user: 'freekds',
    password: 'yourpassword',
    name: 'kds_db',
  },
  port: 3000,
  sessionSecret: 'changeme',
  secureCookie: false,
  backupDir: path.join(__dirname, 'backups'),
  rateLimit: {
    // Allow up to 1000 requests per minute by default
    windowMs: 60 * 1000,
    max: 1000,
  },
};
