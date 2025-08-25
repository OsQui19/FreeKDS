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
  '/api/login',
  '/api/tokens',
  '/api/log',
];

// Requests for static assets should be allowed through without requiring
// authentication. Add any public asset path prefixes here so that missing
// files return a 404 instead of a redirect to the login page.
const publicAssetPrefixes = [
  '/vendor/',
  '/dist/',
  '/assets/',
  '/app',
  '/schedule',
  '/onboarding',
  '/hierarchy',
  '/adminMenu',
  '/kds',
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
      publicAssetPrefixes.some((prefix) => req.path.startsWith(prefix))
    ) {
      return next();
    }
    logSecurityEvent(db, 'unauthorized', null, req.path, false, req.ip);
    return res.redirect('/login');
  };
};
