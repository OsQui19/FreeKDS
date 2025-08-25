const express = require('express');
const settingsCache = require('./controllers/settingsCache');
const accessControl = require('./controllers/accessControl');
const config = require('../config');
const logger = require('../utils/logger');
const helmetMiddleware = require('../src/middleware/helmet');
const rateLimitMiddleware = require('../src/middleware/rateLimit');
const sessionMiddleware = require('../src/middleware/session');
const authMiddleware = require('./middleware/auth');
const registerRoutes = require('./routes');

function createApp(db, transports) {
  const app = express();
<<<<<<< ours
  const spaIndexPath = path.join(
    __dirname,
    '..',
    'public',
    'dist',
    'index.html',
  );
  if (!fs.existsSync(spaIndexPath)) {
    const msg = `Missing ${spaIndexPath}. Run "npm run build" to generate client assets.`;
    logger.error(msg);
    throw new Error(msg);
  }
=======
>>>>>>> theirs
  app.use(helmetMiddleware());
  app.use(rateLimitMiddleware(config));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(sessionMiddleware(db, config, logger));
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return res.redirect('http://' + req.headers.host + req.originalUrl);
    }
    next();
  });
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
<<<<<<< ours
  // Deliver the SPA for any remaining routes such as /login
  app.get('*', (req, res, next) => {
    res.sendFile(spaIndexPath, (err) => {
      if (err) next(err);
    });
  });

  app.use((err, req, res, next) => {
    if (err.code === 'ENOENT' && err.path === spaIndexPath) {
      logger.error('Missing SPA build at %s', spaIndexPath);
      return res
        .status(503)
        .send('Frontend build is missing. Run "npm run build".');
    }
    next(err);
  });
=======
>>>>>>> theirs
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
