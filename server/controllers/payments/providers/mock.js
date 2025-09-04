const crypto = require('crypto');

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

module.exports = {
  async createIntent({ amount, currency = 'usd', metadata = {} }) {
    return {
      id: id('pi'),
      status: 'requires_capture',
      amount,
      currency,
      client_secret: id('secret'),
      provider: 'mock',
      metadata,
    };
  },
  async captureIntent(intentId) {
    return {
      id: intentId,
      status: 'succeeded',
      captured: true,
      provider: 'mock',
    };
  },
  async refund({ payment_id, amount }) {
    return {
      id: id('re'),
      status: 'succeeded',
      amount,
      payment_id,
      provider: 'mock',
    };
  },
};

