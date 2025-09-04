const express = require('express');
const { resolveProvider } = require('../../controllers/payments');

module.exports = (db, transports) => {
  const router = express.Router();
  const provider = resolveProvider({});
  const io = transports?.io;

  router.post('/payments/intents', async (req, res) => {
    const { amount, currency, metadata } = req.body || {};
    if (!amount || Number.isNaN(Number(amount))) return res.status(400).json({ error: 'Invalid amount' });
    try {
      const r = await provider.createIntent({ amount: Number(amount), currency: currency || 'usd', metadata });
      io && io.emit('paymentEvent', { type: 'intent.created', data: r });
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create intent' });
    }
  });

  router.post('/payments/intents/:id/capture', async (req, res) => {
    try {
      const r = await provider.captureIntent(req.params.id);
      io && io.emit('paymentEvent', { type: 'intent.captured', data: r });
      res.json(r);
    } catch {
      res.status(500).json({ error: 'Failed to capture' });
    }
  });

  router.post('/payments/refunds', async (req, res) => {
    const { payment_id, amount } = req.body || {};
    if (!payment_id) return res.status(400).json({ error: 'payment_id required' });
    try {
      const r = await provider.refund({ payment_id, amount: amount != null ? Number(amount) : null });
      io && io.emit('paymentEvent', { type: 'refund.created', data: r });
      res.json(r);
    } catch {
      res.status(500).json({ error: 'Failed to refund' });
    }
  });

  return router;
};

