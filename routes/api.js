const express = require('express');
const { updateItemModifiers, getBumpedOrders, logInventoryForOrder } = require('../controllers/dbHelpers');

module.exports = (db, io) => {
  const router = express.Router();

  router.post('/api/orders', (req, res) => {
    const { order_number, order_type, items, special_instructions, allergy } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }
    db.query('INSERT INTO orders (order_number, order_type, special_instructions, allergy) VALUES (?, ?, ?, ?)',
                [order_number || null, order_type || null, special_instructions || null, allergy ? 1 : 0], (err, result) => {
      if (err) {
        console.error('Error inserting order:', err);
        return res.status(500).send('DB Error');
      }
      const orderId = result.insertId;
      const orderItemInfo = [];
      const insertNext = (idx) => {
        if (idx >= items.length) {
          const modValues = [];
          orderItemInfo.forEach(oi => {
            if (Array.isArray(oi.modifier_ids)) {
              oi.modifier_ids.forEach(mid => { modValues.push([oi.id, mid]); });
            }
          });
          const finish = async () => {
            await logInventoryForOrder(db, orderId, items).catch(err5 => console.error('Inventory log error:', err5));
            const fetchSql = `SELECT oi.id AS order_item_id, oi.quantity, mi.name, mi.station_id,
                                GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                                FROM order_items oi
                                JOIN menu_items mi ON oi.menu_item_id = mi.id
                                LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                                LEFT JOIN modifiers m ON oim.modifier_id = m.id
                                WHERE oi.order_id=?
                                GROUP BY oi.id`;
            db.query(fetchSql, [orderId], (err3, rows) => {
              if (err3) {
                console.error('Error fetching items:', err3);
                return res.status(500).send('DB Error');
              }
              const stationMap = {};
              rows.forEach(r => {
                if (!stationMap[r.station_id]) stationMap[r.station_id] = [];
                stationMap[r.station_id].push({ quantity: r.quantity, name: r.name, stationId: r.station_id, modifiers: r.modifiers ? r.modifiers.split(', ') : [] });
              });
              const createdTs = Math.floor(Date.now() / 1000);
              Object.keys(stationMap).forEach(id => {
                io.to(`station-${id}`).emit('orderAdded', {
                  orderId,
                  orderNumber: order_number || orderId,
                  orderType: order_type || '',
                  specialInstructions: special_instructions || '',
                  allergy: !!allergy,
                  createdTs,
                  items: stationMap[id]
                });
              });
              io.to('expo').emit('orderAdded', {
                orderId,
                orderNumber: order_number || orderId,
                orderType: order_type || '',
                specialInstructions: special_instructions || '',
                allergy: !!allergy,
                createdTs,
                items: rows.map(r => ({ quantity: r.quantity, name: r.name, stationId: r.station_id, modifiers: r.modifiers ? r.modifiers.split(', ') : [] }))
              });
              res.json({ success: true, orderId });
            });
          };
          if (modValues.length === 0) {
            finish();
          } else {
            db.query('INSERT INTO order_item_modifiers (order_item_id, modifier_id) VALUES ?', [modValues], err4 => {
              if (err4) console.error('Error inserting order item modifiers:', err4);
              finish();
            });
          }
          return;
        }
        const it = items[idx];
        if (!it.menu_item_id || !it.quantity) {
          insertNext(idx + 1);
          return;
        }
        db.query('INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)', [orderId, it.menu_item_id, it.quantity], (err2, res2) => {
          if (err2) {
            console.error('Error inserting order item:', err2);
            return res.status(500).send('DB Error');
          }
          orderItemInfo.push({ id: res2.insertId, modifier_ids: it.modifier_ids });
          insertNext(idx + 1);
        });
      };
      insertNext(0);
    });
  });

  router.get('/api/bumped_orders', (req, res) => {
    const stationId = parseInt(req.query.station_id, 10);
    const limit = parseInt(req.query.limit, 10) || 20;
    if (isNaN(stationId)) return res.status(400).json({ error: 'station_id required' });
    getBumpedOrders(db, stationId, (err, orders) => {
      if (err) {
        console.error('Error fetching bumped orders:', err);
        return res.status(500).send('DB Error');
      }
      res.json({ orders });
    }, limit);
  });

  router.get('/api/recipe', (req, res) => {
    const id = req.query.id;
    const name = req.query.name;
    if (!id && !name) return res.json({ recipe: null });
    const sql = id ? 'SELECT recipe FROM menu_items WHERE id=? LIMIT 1'
                   : 'SELECT recipe FROM menu_items WHERE name=? LIMIT 1';
    const param = id ? id : name;
    db.query(sql, [param], (err, rows) => {
      if (err) {
        console.error('Error fetching recipe:', err);
        return res.status(500).send('DB Error');
      }
      if (rows.length) {
        res.json({ recipe: rows[0].recipe });
      } else {
        res.json({ recipe: null });
      }
    });
  });

  return router;
};
