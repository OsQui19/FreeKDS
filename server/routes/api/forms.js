const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  router.post('/forms/contact', express.json(), async (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Invalid data' });
    try {
      await db
        .promise()
        .query('INSERT INTO contact_submissions (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit' });
    }
  });

  return router;
};

