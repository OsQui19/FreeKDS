const express = require('express');

module.exports = function registerRoutes(db, io) {
  const router = express.Router();
  router.use(require('./auth')(db, io));
  router.use(require('./admin')(db, io));
  router.use(require('./stations')(db));
  router.use(require('./api')(db, io));
  return router;
};
