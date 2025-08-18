const express = require('express');
const accessControl = require('../../controllers/accessControl');
const { query } = require('../../../utils/db');

module.exports = (db) => {
  const router = express.Router();

  router.get('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const scope = req.query.scope === 'restaurant' ? 'restaurant' : 'user';
    let targetUserId = null;
    if (scope === 'user') {
      if (req.query.userId) targetUserId = parseInt(req.query.userId, 10);
      if (!targetUserId) targetUserId = req.session.user.id;
      if (!targetUserId) return res.status(400).send('userId required');
      if (
        req.session.user.id &&
        targetUserId !== req.session.user.id &&
        !accessControl.hasLevel(req.session.user.role, 'management')
      ) {
        return res.status(403).send('Forbidden');
      }
    }
    try {
      let key;
      if (scope === 'restaurant') {
        key = 'layout_restaurant';
      } else {
        key = `layout_user_${targetUserId}`;
      }
      let [rows] = await query(db, 'SELECT setting_value FROM settings WHERE setting_key=?', [key]);
      if (!rows.length && scope === 'user') {
        [rows] = await query(
          db,
          "SELECT setting_value FROM settings WHERE setting_key='layout_restaurant'",
        );
      }
      const layout = rows.length ? rows[0].setting_value : null;
      res.json({ layout });
    } catch (err) {
      next(err);
    }
  });

  router.post('/layout', async (req, res, next) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    const { layout, scope, userId } = req.body || {};
    if (typeof layout !== 'string') return res.status(400).send('Invalid layout');
    let key;
    if (scope === 'restaurant') {
      if (!accessControl.hasLevel(req.session.user.role, 'management')) {
        return res.status(403).send('Forbidden');
      }
      key = 'layout_restaurant';
    } else {
      const targetUserId = userId ? parseInt(userId, 10) : req.session.user.id;
      if (!targetUserId) return res.status(400).send('userId required');
      if (
        req.session.user.id &&
        targetUserId !== req.session.user.id &&
        !accessControl.hasLevel(req.session.user.role, 'management')
      ) {
        return res.status(403).send('Forbidden');
      }
      key = `layout_user_${targetUserId}`;
    }
    try {
      await query(
        db,
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)',
        [key, layout],
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
