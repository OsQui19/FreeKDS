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
};
