const express = require('express');
const logger = require('../../../utils/logger');

module.exports = (db, transports) => {
  const router = express.Router();

  router.post('/incoming/orders', async (req, res, next) => {
    // Must be authenticated via API token middleware
    if (!req.apiToken || !Array.isArray(req.apiToken.scopes) || !req.apiToken.scopes.includes('orders:write')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const payload = req.body || {};
      const orderNumber = payload.order_number || null;
      const orderType = payload.order_type || null;
      const source = payload.source || 'online';
      const channel = payload.channel || 'api';
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) return res.status(400).json({ error: 'No items' });
      // Map item names to ids if necessary
      for (const it of items) {
        if (!it.menu_item_id && it.name) {
          const [rows] = await db.promise().query('SELECT id FROM menu_items WHERE name=? LIMIT 1', [it.name]);
          if (rows.length) it.menu_item_id = rows[0].id; else return res.status(400).json({ error: `Unknown item: ${it.name}` });
        }
        if (!it.quantity) it.quantity = 1;
      }
      // Reuse existing orders insertion logic (inline simplified copy)
      const conn = await db.promise().getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query('INSERT INTO orders (order_number, order_type, source, channel, special_instructions, allergy) VALUES (?, ?, ?, ?, ?, ?)', [orderNumber, orderType, source || null, channel || null, payload.special_instructions || null, payload.allergy ? 1 : 0]);
        const orderId = result.insertId;
        const orderItemInfo = [];
        for (const it of items) {
          const [res2] = await conn.query('INSERT INTO order_items (order_id, menu_item_id, quantity, special_instructions, allergy) VALUES (?, ?, ?, ?, ?)', [orderId, it.menu_item_id, it.quantity, it.special_instructions || null, it.allergy ? 1 : 0]);
          orderItemInfo.push({ id: res2.insertId, modifier_ids: it.modifier_ids });
        }
        const modValues = [];
        orderItemInfo.forEach((oi) => { (Array.isArray(oi.modifier_ids) ? oi.modifier_ids : []).forEach((mid) => modValues.push([oi.id, mid])); });
        if (modValues.length) await conn.query('INSERT INTO order_item_modifiers (order_item_id, modifier_id) VALUES ?', [modValues]);
        await conn.commit();
        const createdTs = Math.floor(Date.now() / 1000);
        // Emit to stations and expo
        const [rows] = await db
          .promise()
          .query(`SELECT oi.id AS order_item_id, oi.quantity, mi.name, mi.station_id, mi.id AS item_id,
                         oi.special_instructions, oi.allergy,
                         GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                    FROM order_items oi
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                    LEFT JOIN modifiers m ON oim.modifier_id = m.id
                   WHERE oi.order_id=? GROUP BY oi.id`, [orderId]);
        const stationMap = {};
        rows.forEach((r) => { (stationMap[r.station_id] = stationMap[r.station_id] || []).push({ quantity: r.quantity, name: r.name, stationId: r.station_id, itemId: r.item_id, orderItemId: r.order_item_id, modifiers: r.modifiers ? r.modifiers.split(', ') : [], specialInstructions: r.special_instructions || '', allergy: !!r.allergy }); });
        Object.keys(stationMap).forEach((id) => {
          const payloadOut = { orderId, orderNumber: orderNumber || orderId, orderType: orderType || '', specialInstructions: payload.special_instructions || '', allergy: !!payload.allergy, source: source || '', channel: channel || '', createdTs, items: stationMap[id] };
          transports.io && transports.io.to(`station-${id}`).emit('orderAdded', payloadOut);
          transports.sse && transports.sse.emitToStation(id, 'orderAdded', payloadOut);
        });
        const expoPayload = { orderId, orderNumber: orderNumber || orderId, orderType: orderType || '', specialInstructions: payload.special_instructions || '', allergy: !!payload.allergy, source: source || '', channel: channel || '', createdTs, items: rows.map((r)=> ({ quantity: r.quantity, name: r.name, stationId: r.station_id, itemId: r.item_id, orderItemId: r.order_item_id, modifiers: r.modifiers ? r.modifiers.split(', ') : [], specialInstructions: r.special_instructions || '', allergy: !!r.allergy })) };
        transports.io && transports.io.to('expo').emit('orderAdded', expoPayload);
        transports.sse && transports.sse.emitToExpo('orderAdded', expoPayload);
        return res.json({ success: true, orderId });
      } catch (err2) {
        await conn.rollback();
        logger.error('Incoming order error:', err2);
        next(err2);
      } finally {
        conn.release();
      }
    } catch (err) {
      next(err);
    }
  });

  router.get('/webhooks/deliveries', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    try {
      const [rows] = await db.promise().query('SELECT id, event, status_code, response_ms, error, created_at FROM webhook_deliveries ORDER BY id DESC LIMIT ?', [limit]);
      res.json({ deliveries: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load deliveries' });
    }
  });

  router.post('/webhooks/test', async (req, res) => {
    try {
      const webhooks = require('../../controllers/webhooks');
      await webhooks.send('test', { ok: true }, db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send test' });
    }
  });

  router.post('/webhooks/resend/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
      const [rows] = await db.promise().query('SELECT event, payload FROM webhook_deliveries WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      const event = rows[0].event;
      let payload;
      try { payload = JSON.parse(rows[0].payload); } catch { payload = { raw: rows[0].payload }; }
      const webhooks = require('../../controllers/webhooks');
      await webhooks.send(event, payload, db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to resend' });
    }
  });

  return router;
};
