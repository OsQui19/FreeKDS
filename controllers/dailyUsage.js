const logger = require('../utils/logger');
async function recordDailyUsage(db) {
  try {
    const [rows] = await db.promise().query(
      `SELECT DATE(created_at) AS day, ingredient_id, SUM(amount) AS total
         FROM inventory_log
         WHERE DATE(created_at) = DATE(NOW() - INTERVAL 1 DAY)
         GROUP BY ingredient_id`,
    );
    for (const r of rows) {
      await db.promise().query(
        `INSERT INTO daily_usage_log (start_date, end_date, ingredient_id, amount)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount), end_date = VALUES(end_date)`,
        [r.day, r.day, r.ingredient_id, r.total],
      );
    }
  } catch (err) {
    logger.error("Daily usage log error:", err);
  }
}

function scheduleDailyLog(db) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  setTimeout(async () => {
    await recordDailyUsage(db);
    scheduleDailyLog(db);
  }, next - now);
}

module.exports = { recordDailyUsage, scheduleDailyLog };
