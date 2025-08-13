const express = require('express');

module.exports = function registerRoutes(db, io) {
  const router = express.Router();
  router.use(require('../../routes/auth')(db, io));
  router.use(require('../../routes/admin')(db, io));
  router.use(require('../../routes/stations')(db));
  router.use(require('../../routes/api')(db, io));
  return router;
};
