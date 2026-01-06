const express = require('express');
const path = require('path');
const fs = require('fs');
const settingsCache = require('./controllers/settingsCache');
const accessControl = require('./controllers/accessControl');
const config = require('../config');
const logger = require('../utils/logger');
const helmetMiddleware = require('../src/middleware/helmet');
const rateLimitMiddleware = require('../src/middleware/rateLimit');
const sessionMiddleware = require('../src/middleware/session');
const authMiddleware = require('./middleware/auth');
const apiTokenAuth = require('./middleware/apiTokenAuth');
const registerRoutes = require('./routes');

function createApp(db, transports) {
  const app = express();
  app.use(helmetMiddleware());
  app.use(rateLimitMiddleware(config));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(sessionMiddleware(db, config, logger));
  // Do not force protocol downgrades; allow proxy to manage HTTPS.
  // If you want to force HTTPS in production, do it explicitly via config.
  app.use(express.static(path.join(__dirname, '../dist')));
  // Serve uploaded assets (branding)
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
  app.use(apiTokenAuth(db, logger));
  app.use(authMiddleware(db));
  app.use((req, res, next) => {
    res.locals.settings = settingsCache.getSettings();
    next();
  });
  app.use((req, res, next) => {
    res.locals.req = req;
    res.locals.roles = accessControl.getHierarchy();
    res.locals.hasRoleLevel = (minRole) =>
      req.session && req.session.user
        ? accessControl.hasLevel(req.session.user.role, minRole)
        : false;
    res.locals.permissions = accessControl.getPermissions();
    res.locals.hasAccess = (component) =>
      req.session && req.session.user
        ? accessControl.roleHasAccess(req.session.user.role, component)
        : false;
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
  });
  app.use(registerRoutes(db, transports));
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    next();
  });
  app.get('*', (req, res) => {
    // Prevent Express from handling engine.io or SSE upgrade/endpoints
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/sse')) {
      return; // let socket.io/SSE handlers on the server respond
    }
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    logger.warn('Front-end assets not built');
    res.status(500).send('Front-end assets not built');
  });
  app.use((err, req, res, next) => {
    logger.error('Unhandled application error', err);
    if (res.headersSent) return next(err);
    if (typeof res.status === 'function') {
      res.status(500).send('Internal Server Error');
    } else {
      res.writeHead(500).end('Internal Server Error');
    }
  });
  return app;
}

module.exports = createApp;
