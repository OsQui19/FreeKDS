const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const settingsCache = require('../controllers/settingsCache');
const { logSecurityEvent } = require('../controllers/securityLog');
const accessControl = require('../controllers/accessControl');
const config = require('../config');
const logger = require('../utils/logger');

function createApp(db, io) {
  const app = express();
  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
  delete cspDirectives['upgrade-insecure-requests'];
  app.use(
    helmet({
      contentSecurityPolicy: { directives: cspDirectives },
      hsts: { maxAge: 0 },
    })
  );
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    skip: (req) => req.path.startsWith('/socket.io'),
  });
  app.use(limiter);
  const sessionStore = new MySQLStore({}, db);
  const secureCookie = config.secureCookie;
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
      },
    })
  );
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return res.redirect('http://' + req.headers.host + req.originalUrl);
    }
    next();
  });
  app.use((req, res, next) => {
    const publicPaths = [
      '/login',
      '/login.css',
      '/style.css',
      '/base.css',
      '/clock.css',
      '/clock',
      '/clock.js',
      '/clock/dashboard',
      '/favicon.ico',
      '/order',
      '/order.js',
      '/order.css',
      '/bootstrap-vars.css',
      '/health',
    ];
    if (
      req.session.user ||
      publicPaths.includes(req.path) ||
      req.path.startsWith('/vendor/')
    )
      return next();
    logSecurityEvent(db, 'unauthorized', null, req.path, false, req.ip);
    return res.redirect('/login');
  });
  app.use(express.static(path.join(__dirname, '..', 'public')));
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
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  const adminRoutes = require('../routes/admin')(db, io);
  const authRoutes = require('../routes/auth')(db, io);
  const stationRoutes = require('../routes/stations')(db);
  const apiRoutes = require('../routes/api')(db, io);
  app.use(authRoutes);
  app.use(adminRoutes);
  app.use(stationRoutes);
  app.use(apiRoutes);
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/clock');
    res.render('home');
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
