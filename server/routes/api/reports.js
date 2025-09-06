const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  router.get('/reports/kitchen', async (req, res) => {
    const now = new Date();
    const minutes = parseInt(req.query.minutes || '60', 10);
    const since = new Date(now.getTime() - minutes * 60000);
    const thresholdWarn = parseInt(req.query.warn || '7', 10) * 60; // seconds
    const thresholdCrit = parseInt(req.query.crit || '12', 10) * 60; // seconds
    try {
      const [active] = await db
        .promise()
        .query("SELECT COUNT(*) AS count FROM orders WHERE status='active'");
      const [recent] = await db
        .promise()
        .query(
          `SELECT o.id, o.created_at, bo.bumped_at,
                  TIMESTAMPDIFF(SECOND, o.created_at, bo.bumped_at) AS prep_seconds
             FROM bumped_orders bo
             JOIN orders o ON o.id=bo.order_id
            WHERE bo.bumped_at >= ?
            ORDER BY bo.bumped_at DESC`,
          [since],
        );
      const completed = recent.length;
      const avgPrep = completed
        ? Math.round(recent.reduce((s, r) => s + (r.prep_seconds || 0), 0) / completed)
        : 0;
      let onTime = 0, warn = 0, crit = 0;
      recent.forEach((r) => {
        const s = r.prep_seconds || 0;
        if (s >= thresholdCrit) crit += 1;
        else if (s >= thresholdWarn) warn += 1;
        else onTime += 1;
      });
      res.json({
        active: active[0]?.count || 0,
        completed,
        avg_prep_seconds: avgPrep,
        on_time: onTime,
        warn,
        critical: crit,
        since: since.toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load report' });
    }
  });

  return router;
};

