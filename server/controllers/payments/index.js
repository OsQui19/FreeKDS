const mock = require('./providers/mock');

function resolveProvider(config) {
  // TODO: switch on config.provider; default to mock for now.
  return mock;
}

module.exports = { resolveProvider };

