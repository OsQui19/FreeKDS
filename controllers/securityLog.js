const logger = require('../utils/logger');
const logSecurityEvent = async (db, event, username, path, success, ip) => {
  const outcome = success ? 'success' : 'failure';
  logger.warn(`[SECURITY] ${event} ${outcome} user=${username || 'unknown'} path=${path} ip=${ip}`);
  try {
    await db
      .promise()
      .query(
        'INSERT INTO security_log (event, username, path, success, ip_address) VALUES (?, ?, ?, ?, ?)',
        [event, username, path, success ? 1 : 0, ip],
      );
  } catch (err) {
    logger.error('Security log error', err);
  }
};

module.exports = { logSecurityEvent };
