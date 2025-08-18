const express = require('express');

module.exports = function registerRoutes(db, io) {
  const router = express.Router();
  router.use('/api', require('./auth')(db, io));
  router.use('/api', require('./admin')(db, io));
  router.use('/api', require('./stations')(db));
  router.use(require('./api')(db, io));
  return router;
};
