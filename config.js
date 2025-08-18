const path = require('path');

// Default configuration for local, offline installations
module.exports = {
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'freekds',
    password: process.env.DB_PASSWORD || 'yourpassword',
    name: process.env.DB_NAME || 'kds_db',
    port: Number(process.env.DB_PORT) || 3306,
  },
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'changeme',
  secureCookie: false,
  backupDir: path.join(__dirname, 'backups'),
  rateLimit: {
    // Allow up to 1000 requests per minute by default
    windowMs: 60 * 1000,
    max: 1000,
  },
  githubRepo: process.env.GITHUB_REPO || '',
  defaultTransport: 'ws', /* see docs/realtime.md */
};
