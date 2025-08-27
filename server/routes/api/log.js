const express = require('express');
const logger = require('../../../utils/logger');

const router = express.Router();

// Accepts JSON payloads from the client and logs them on the server. This
// endpoint is intentionally unauthenticated so that front-end error handlers
// can report issues without triggering security warnings.
router.post('/log', (req, res) => {
  const { message, stack, ...meta } = req.body || {};
  logger.error(message || 'Client error', { stack, ...meta });
  res.json({ success: true });
});

module.exports = router;

