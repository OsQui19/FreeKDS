const crypto = require('crypto');

function pinLookup(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex').slice(0, 8);
}

module.exports = { pinLookup };
