const { logSecurityEvent } = require('../controllers/securityLog');

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
  '/foh/order',
  '/order.js',
  '/order.css',
  '/bootstrap-vars.css',
  '/health',
];

module.exports = function authMiddleware(db) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      const role = req.headers['x-test-role'];
      if (role) req.session.user = { role };
      return next();
    }
    if (
      req.session.user ||
      publicPaths.includes(req.path) ||
      req.path.startsWith('/vendor/') ||
      req.path.startsWith('/dist/')
    ) {
      return next();
    }
    logSecurityEvent(db, 'unauthorized', null, req.path, false, req.ip);
    return res.redirect('/login');
  };
};
