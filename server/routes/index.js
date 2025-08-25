const express = require('express');

module.exports = function registerRoutes(db, transports) {
  const router = express.Router();
  router.use('/api', require('./auth')(db, transports));
  router.use('/api', require('./admin')(db, transports));
  router.use('/api', require('./stations')(db));
  router.use('/api', require('./api/layout')(db));
  router.use('/api', require('./api/tokens'));
  router.use('/api', require('./api/log'));
  router.use('/api', require('./api/flags')());
  router.use(require('./api')(db, transports));
  return router;
};
