const logger = require('../../utils/logger');

function getBumpedOrders(db, stationId, callback, limit = 20) {
  const infoSql = `SELECT bo.order_id,
                          COALESCE(bo.order_number, o.order_number) AS order_number,
                          o.order_type,
                          o.special_instructions,
                          o.allergy,
                          UNIX_TIMESTAMP(o.created_at) AS ts
                   FROM bumped_orders bo
                   LEFT JOIN orders o ON bo.order_id = o.id
                   WHERE bo.station_id=?
                   ORDER BY bo.bumped_at DESC
                   LIMIT ?`;
  db.query(infoSql, [stationId, limit], (err, infoRows) => {
    if (err || infoRows.length === 0) return callback(err, []);
    const orderIds = infoRows.map((r) => r.order_id);
    const itemsSql = `SELECT oi.order_id, oi.quantity, mi.name, mi.station_id,
                             mi.id AS item_id, oi.special_instructions,
                             oi.allergy, GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                      FROM order_items oi
                      JOIN menu_items mi ON oi.menu_item_id = mi.id
                      LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                      LEFT JOIN modifiers m ON oim.modifier_id = m.id
                      WHERE oi.order_id IN (?)
                      GROUP BY oi.id
                      ORDER BY oi.order_id, oi.id`;
    db.query(itemsSql, [orderIds], (err2, itemRows) => {
      if (err2) return callback(err2);
      const ordersMap = {};
      infoRows.forEach((r) => {
        ordersMap[r.order_id] = {
          order_id: r.order_id,
          order_number: r.order_number,
          order_type: r.order_type,
          special_instructions: r.special_instructions || '',
          allergy: !!r.allergy,
          ts: r.ts,
          items: [],
        };
      });
      itemRows.forEach((row) => {
        if (ordersMap[row.order_id]) {
          ordersMap[row.order_id].items.push({
            quantity: row.quantity,
            name: row.name,
            stationId: row.station_id,
            itemId: row.item_id,
            modifiers: row.modifiers ? row.modifiers.split(', ') : [],
            specialInstructions: row.special_instructions || '',
            allergy: !!row.allergy,
          });
        }
      });
      const ordered = infoRows.map((r) => ordersMap[r.order_id]);
      callback(null, ordered);
    });
  });
}

module.exports = { getBumpedOrders };
