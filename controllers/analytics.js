function formatDateTime(dt) {
  if (typeof dt === 'string') dt = new Date(dt);
  return dt.toISOString().slice(0, 19).replace('T', ' ');
}

function parseDateRange(start, end) {
  const endDate = end ? new Date(end) : new Date();
  const startDate = start
    ? new Date(start)
    : new Date(endDate.getTime() - 29 * 86400000);
  return { startDate, endDate };
}

async function fetchSalesTotals(db, start, end) {
  const { startDate, endDate } = parseDateRange(start, end);
  const salesSql = `SELECT DATE(o.created_at) AS date, SUM(mi.price * oi.quantity) AS total
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    WHERE o.status='completed' AND o.created_at BETWEEN ? AND ?
                    GROUP BY DATE(o.created_at)`;
  const costSql = `SELECT DATE(l.created_at) AS date, SUM(l.amount * ing.cost) AS cost
                   FROM inventory_log l
                   JOIN ingredients ing ON l.ingredient_id = ing.id
                   JOIN orders o ON l.order_id = o.id
                   WHERE o.status='completed' AND l.created_at BETWEEN ? AND ?
                   GROUP BY DATE(l.created_at)`;
  const [salesRows] = await db.promise().query(salesSql, [formatDateTime(startDate), formatDateTime(endDate)]);
  const [costRows] = await db.promise().query(costSql, [formatDateTime(startDate), formatDateTime(endDate)]);
  const map = {};
  salesRows.forEach((r) => {
    const total = parseFloat(r.total) || 0;
    map[r.date] = { date: r.date, total, cost: 0 };
  });
  costRows.forEach((r) => {
    const cost = parseFloat(r.cost) || 0;
    if (!map[r.date]) map[r.date] = { date: r.date, total: 0, cost };
    else map[r.date].cost = cost;
  });
  const list = Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  list.forEach((r) => {
    r.profit = (r.total || 0) - (r.cost || 0);
    r.margin = r.total ? (r.profit / r.total) * 100 : 0;
    r.roi = r.cost ? (r.profit / r.cost) * 100 : 0;
  });
  return list;
}

async function fetchIngredientUsage(db, start, end) {
  const { startDate, endDate } = parseDateRange(start, end);
  const sql = `SELECT ing.name, SUM(l.amount) AS total
               FROM inventory_log l
               JOIN ingredients ing ON l.ingredient_id = ing.id
               JOIN orders o ON l.order_id = o.id
               WHERE o.status='completed' AND l.created_at BETWEEN ? AND ?
               GROUP BY ing.id
               ORDER BY ing.name`;
  const [rows] = await db
    .promise()
    .query(sql, [formatDateTime(startDate), formatDateTime(endDate)]);
  return rows.map((r) => ({ name: r.name, total: parseFloat(r.total) || 0 }));
}

async function fetchTopMenuItems(db, start, end, limit = 10) {
  const { startDate, endDate } = parseDateRange(start, end);
  const sql = `SELECT mi.name, SUM(oi.quantity) AS qty,
                      SUM(mi.price * oi.quantity) AS revenue
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE o.status='completed' AND o.created_at BETWEEN ? AND ?
                GROUP BY mi.id
                ORDER BY revenue DESC
                LIMIT ?`;
  const [rows] = await db
    .promise()
    .query(sql, [formatDateTime(startDate), formatDateTime(endDate), limit]);
  return rows.map((r) => ({
    name: r.name,
    qty: parseFloat(r.qty) || 0,
    revenue: parseFloat(r.revenue) || 0,
  }));
}

async function fetchCategorySales(db, start, end) {
  const { startDate, endDate } = parseDateRange(start, end);
  const sql = `SELECT c.name, SUM(mi.price * oi.quantity) AS total
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 JOIN menu_items mi ON oi.menu_item_id = mi.id
                 JOIN categories c ON mi.category_id = c.id
                WHERE o.status='completed' AND o.created_at BETWEEN ? AND ?
                GROUP BY c.id
                ORDER BY c.name`;
  const [rows] = await db
    .promise()
    .query(sql, [formatDateTime(startDate), formatDateTime(endDate)]);
  return rows.map((r) => ({ name: r.name, total: parseFloat(r.total) || 0 }));
}

async function fetchLowStockIngredients(db, threshold = 5) {
  const sql = `SELECT ing.name, ing.quantity, u.abbreviation AS unit
                 FROM ingredients ing
                 LEFT JOIN units u ON ing.unit_id = u.id
                WHERE ing.quantity <= ?
                ORDER BY ing.quantity ASC, ing.name`;
  const [rows] = await db.promise().query(sql, [threshold]);
  return rows.map((r) => ({
    name: r.name,
    quantity: parseFloat(r.quantity) || 0,
    unit: r.unit,
  }));
}

async function fetchAverageBumpTimes(db, start, end) {
  const { startDate, endDate } = parseDateRange(start, end);
  const sql = `SELECT s.id AS station_id, s.name,
                      AVG(TIMESTAMPDIFF(SECOND, o.created_at, bo.bumped_at)) AS avg_seconds
                 FROM bumped_orders bo
                 JOIN orders o ON bo.order_id = o.id
                 JOIN stations s ON bo.station_id = s.id
                WHERE bo.bumped_at BETWEEN ? AND ?
                GROUP BY s.id
                ORDER BY s.name`;
  const [rows] = await db
    .promise()
    .query(sql, [formatDateTime(startDate), formatDateTime(endDate)]);
  return rows.map((r) => ({
    station_id: r.station_id,
    name: r.name,
    avg_seconds: parseFloat(r.avg_seconds) || 0,
  }));
}

module.exports = {
  fetchSalesTotals,
  fetchIngredientUsage,
  fetchTopMenuItems,
  fetchCategorySales,
  fetchLowStockIngredients,
  fetchAverageBumpTimes,
};
