const helmet = require('helmet');

module.exports = function helmetMiddleware() {
  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
  delete cspDirectives['upgrade-insecure-requests'];
  return helmet({
    contentSecurityPolicy: { directives: cspDirectives },
    hsts: { maxAge: 0 },
  });
};
