const express = require('express');
const { roleHasAccess } = require('../../controllers/accessControl');
const {
  fetchSalesTotals,
  fetchIngredientUsage,
  fetchTopMenuItems,
  fetchCategorySales,
  fetchAverageBumpTimes,
} = require('../../controllers/analytics');

module.exports = (db) => {
  const router = express.Router();

  // Require session + reports access
  router.use((req, res, next) => {
    const role = req.session && req.session.user ? req.session.user.role : null;
    if (!role || !roleHasAccess(role, 'reports')) return res.status(403).json({ error: 'Forbidden' });
    next();
  });

  router.get('/analytics/sales', async (req, res) => {
    try {
      const rows = await fetchSalesTotals(db, req.query.start, req.query.end);
      res.json({ rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load sales' });
    }
  });

  router.get('/analytics/ingredients/usage', async (req, res) => {
    try {
      const rows = await fetchIngredientUsage(db, req.query.start, req.query.end);
      res.json({ rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load ingredient usage' });
    }
  });

  router.get('/analytics/top-items', async (req, res) => {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '10', 10), 100));
    try {
      const rows = await fetchTopMenuItems(db, req.query.start, req.query.end, limit);
      res.json({ rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load top items' });
    }
  });

  router.get('/analytics/category-sales', async (req, res) => {
    try {
      const rows = await fetchCategorySales(db, req.query.start, req.query.end);
      res.json({ rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load category sales' });
    }
  });

  router.get('/analytics/station-bump-times', async (req, res) => {
    try {
      const rows = await fetchAverageBumpTimes(db, req.query.start, req.query.end);
      res.json({ rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load station bump times' });
    }
  });

  return router;
};

