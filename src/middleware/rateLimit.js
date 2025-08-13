const rateLimit = require('express-rate-limit');

module.exports = function rateLimitMiddleware(config) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    skip: (req) => req.path.startsWith('/socket.io'),
  });
};
