const logger = require('../../utils/logger');
const { query } = require('../../utils/db');
module.exports = function (io, db, transports = {}) {
  const { sse } = transports;
  io.on("connection", (socket) => {
    const registerStation = async (stationId) => {
      socket.stationId = parseInt(stationId, 10);
      if (isNaN(socket.stationId)) return;
      try {
        const [rows] = await query(
          db,
          "SELECT type FROM stations WHERE id=?",
          [socket.stationId],
        );
        if (rows.length) {
          const type = (rows[0].type || "").trim().toLowerCase();
          if (type === "expo" || type === "prep") {
            socket.stationType = type;
          } else {
            socket.stationType = rows[0].type;
          }
          socket.join(`station-${socket.stationId}`);
          if (socket.stationType === "expo") socket.join("expo");
          logger.info(
            "Registered station",
            socket.stationId,
            socket.stationType,
          );
        } else {
          logger.info("Failed to register station", socket.stationId);
        }
      } catch (err) {
        logger.info("Failed to register station", socket.stationId, err);
      }
    };

    if (socket.handshake.query && socket.handshake.query.stationId) {
      registerStation(socket.handshake.query.stationId);
    }

    socket.on("register", registerStation);

    socket.on("ping", () => socket.emit("pong"));

    socket.on("bumpOrder", async ({ orderId }) => {
      if (!orderId) return;
      if (!socket.stationType) {
        logger.info("bumpOrder from unregistered socket", socket.stationId);
        return;
      }
      logger.info("bumpOrder", {
        orderId,
        stationId: socket.stationId,
        type: socket.stationType,
      });
      try {
        if (socket.stationType === "expo") {
          await query(db, 'UPDATE orders SET status="completed" WHERE id=?', [orderId]);
          await query(
            db,
            `INSERT INTO bumped_orders (order_id, station_id, order_number)
                   SELECT id, ?, order_number FROM orders WHERE id=?
                   ON DUPLICATE KEY UPDATE bumped_at=NOW(), order_number=VALUES(order_number)`,
            [socket.stationId, orderId, orderId],
          );
          io.emit("orderCompleted", { orderId });
          sse && sse.emitAll("orderCompleted", { orderId });
          try { require('./webhooks').send('order.completed', { orderId }); } catch {}
          io.emit("reportsUpdated");
        } else {
          await query(
            db,
            `INSERT INTO bumped_orders (order_id, station_id, order_number)
                   SELECT id, ?, order_number FROM orders WHERE id=?
                   ON DUPLICATE KEY UPDATE bumped_at=NOW(), order_number=VALUES(order_number)`,
            [socket.stationId, orderId, orderId],
          );
          io.to("expo").emit("stationDone", {
            orderId,
            stationId: socket.stationId,
          });
          sse && sse.emitToExpo("stationDone", {
            orderId,
            stationId: socket.stationId,
          });
          try { require('./webhooks').send('order.progress', { orderId, stationId: socket.stationId }); } catch {}
          // Forward to next station if configured
          try {
            const [ns] = await query(db, 'SELECT next_station_id FROM stations WHERE id=?', [socket.stationId]);
            const nextId = ns[0]?.next_station_id;
            if (nextId) {
              const fetchSql = `SELECT oi.id AS order_item_id, oi.quantity, mi.name, mi.station_id, mi.id AS item_id,
                                       oi.special_instructions, oi.allergy,
                                       GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                                FROM order_items oi
                                JOIN menu_items mi ON oi.menu_item_id = mi.id
                                LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                                LEFT JOIN modifiers m ON oim.modifier_id = m.id
                                WHERE oi.order_id=? AND mi.station_id=?
                                GROUP BY oi.id`;
              const [rows] = await query(db, fetchSql, [orderId, nextId]);
              if (rows.length) {
                const payload = {
                  orderId,
                  orderNumber: orderId,
                  orderType: '',
                  specialInstructions: '',
                  allergy: false,
                  createdTs: Math.floor(Date.now() / 1000),
                  items: rows.map((r) => ({
                    quantity: r.quantity,
                    name: r.name,
                    stationId: r.station_id,
                    itemId: r.item_id,
                    orderItemId: r.order_item_id,
                    modifiers: r.modifiers ? r.modifiers.split(', ') : [],
                    specialInstructions: r.special_instructions || '',
                    allergy: !!r.allergy,
                  })),
                };
                io.to(`station-${nextId}`).emit('orderAdded', payload);
                sse && sse.emitToStation(nextId, 'orderAdded', payload);
              }
            }
          } catch (e) {
            logger.error('Error forwarding to next station:', e);
          }
        }
      } catch (err) {
        logger.error("Error handling bumpOrder:", err);
      }
    });

    socket.on("recallOrder", async ({ orderId }) => {
      if (!orderId) return;
      try {
        // Preserve bumped_orders history for analytics; do not delete on recall.
        if (socket.stationType === "expo") {
          await query(
            db,
            'UPDATE orders SET status="active" WHERE id=?',
            [orderId],
          );
          io.emit("reportsUpdated");
          const fetchSql = `SELECT o.order_number, o.order_type, o.special_instructions, o.allergy, UNIX_TIMESTAMP(o.created_at) AS ts,
                               oi.id AS order_item_id, oi.quantity, mi.name, mi.station_id, mi.id AS item_id,
                               oi.special_instructions AS item_instructions, oi.allergy AS item_allergy,
                               GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                        FROM orders o
                        JOIN order_items oi ON o.id = oi.order_id
                        JOIN menu_items mi ON oi.menu_item_id = mi.id
                        LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                        LEFT JOIN modifiers m ON oim.modifier_id = m.id
                        WHERE o.id=?
                        GROUP BY oi.id
                        ORDER BY oi.id`;
          const [rows] = await query(db, fetchSql, [orderId]);
          if (rows.length === 0) return;
          const stationMap = {};
          rows.forEach((r) => {
            if (!stationMap[r.station_id]) stationMap[r.station_id] = [];
            stationMap[r.station_id].push({
              quantity: r.quantity,
              name: r.name,
              stationId: r.station_id,
              itemId: r.item_id,
              orderItemId: r.order_item_id,
              modifiers: r.modifiers ? r.modifiers.split(", ") : [],
              specialInstructions: r.item_instructions || "",
              allergy: !!r.item_allergy,
            });
          });
          const orderNumber = rows[0].order_number || orderId;
          const orderType = rows[0].order_type || "";
          const specialInstructions = rows[0].special_instructions || "";
          const allergy = !!rows[0].allergy;
          const createdTs = rows[0].ts;
          Object.keys(stationMap).forEach((id) => {
            io.to(`station-${id}`).emit("orderAdded", {
              orderId,
              orderNumber,
              orderType,
              specialInstructions,
              allergy,
              createdTs,
              items: stationMap[id],
            });
            sse && sse.emitToStation(id, "orderAdded", {
              orderId,
              orderNumber,
              orderType,
              specialInstructions,
              allergy,
              createdTs,
              items: stationMap[id],
            });
          });
          const expoPayload = {
            orderId,
            orderNumber,
            orderType,
            specialInstructions,
            allergy,
            createdTs,
            items: rows.map((r) => ({
              quantity: r.quantity,
              name: r.name,
              stationId: r.station_id,
              itemId: r.item_id,
              orderItemId: r.order_item_id,
              modifiers: r.modifiers ? r.modifiers.split(", ") : [],
              specialInstructions: r.item_instructions || "",
              allergy: !!r.item_allergy,
            })),
          };
          io.to("expo").emit("orderAdded", expoPayload);
          sse && sse.emitToExpo("orderAdded", expoPayload);
        } else {
          io.to("expo").emit("stationUndo", {
            orderId,
            stationId: socket.stationId,
          });
          sse && sse.emitToExpo("stationUndo", {
            orderId,
            stationId: socket.stationId,
          });
        }
      } catch (err) {
        logger.error("Error handling recallOrder:", err);
      }
    });
    socket.on('itemPrepared', async ({ orderId, orderItemId, state }) => {
      if (!orderId || !orderItemId) return;
      try {
        // Update DB
        if (state === 'ready') {
          await query(db, 'UPDATE order_items SET state=?, prepared_at=NOW() WHERE id=? AND order_id=?', [state, orderItemId, orderId]);
        } else {
          await query(db, 'UPDATE order_items SET state=?, prepared_at=NULL WHERE id=? AND order_id=?', [state, orderItemId, orderId]);
        }
        // Broadcast item state to station and expo
        io.to(`station-${socket.stationId}`).emit('itemState', { orderId, itemId: orderItemId, state });
        io.to('expo').emit('itemState', { orderId, itemId: orderItemId, state });
        sse && sse.emitToStation(socket.stationId, 'itemState', { orderId, itemId: orderItemId, state });
        sse && sse.emitToExpo('itemState', { orderId, itemId: orderItemId, state });
        // Check if all items are ready => mark order ready
        const [rows] = await db
          .promise()
          .query('SELECT COUNT(*) AS remaining FROM order_items WHERE order_id=? AND state<>"ready"', [orderId]);
        const remaining = rows[0]?.remaining || 0;
        if (remaining === 0) {
          await query(db, 'UPDATE orders SET status="ready", ready_at=NOW() WHERE id=?', [orderId]);
          const readyTs = Math.floor(Date.now() / 1000);
          io.emit('orderReady', { orderId, readyTs });
          sse && sse.emitAll('orderReady', { orderId });
          try { require('./webhooks').send('order.ready', { orderId, readyTs }); } catch {}
        } else {
          await query(db, 'UPDATE orders SET status="active" WHERE id=?', [orderId]);
        }
      } catch (err) {
        logger.error('Error itemPrepared:', err);
      }
    });
    socket.on("markUrgent", async ({ orderId }) => {
      if (!orderId || socket.stationType !== "expo") return;
      const sql = `SELECT DISTINCT mi.station_id
                   FROM order_items oi
                   JOIN menu_items mi ON oi.menu_item_id = mi.id
                   WHERE oi.order_id=?`;
      try {
        const [rows] = await query(db, sql, [orderId]);
        const stationIds = rows.map((r) => r.station_id);
        stationIds.forEach((id) => {
          io.to(`station-${id}`).emit("orderUrgent", { orderId });
          sse && sse.emitToStation(id, "orderUrgent", { orderId });
        });
        io.to("expo").emit("orderUrgent", { orderId });
        sse && sse.emitToExpo("orderUrgent", { orderId });
      } catch (err) {
        logger.error("Error fetching stations for urgent:", err);
      }
    });

    socket.on("holdOrder", async ({ orderId }) => {
      if (!orderId) return;
      try {
        await query(db, 'UPDATE orders SET status="held" WHERE id=?', [orderId]);
        io.to(`station-${socket.stationId}`).emit('orderHeld', { orderId });
        if (socket.stationType !== 'expo') io.to('expo').emit('orderHeld', { orderId });
        if (sse) {
          sse.emitToStation(socket.stationId, 'orderHeld', { orderId });
          sse.emitToExpo('orderHeld', { orderId });
        }
      } catch (err) {
        logger.error('Error holding order:', err);
      }
    });

    socket.on('prioritizeOrder', async ({ orderId, amount }) => {
      if (!orderId) return;
      const inc = Number.isFinite(amount) ? parseInt(amount, 10) : 1;
      try {
        await query(db, 'UPDATE orders SET priority=priority+? WHERE id=?', [inc, orderId]);
        const [rows] = await db
          .promise()
          .query('SELECT priority FROM orders WHERE id=?', [orderId]);
        const priority = rows[0]?.priority || 0;
        io.emit('orderPriority', { orderId, priority });
        sse && sse.emitAll('orderPriority', { orderId, priority });
      } catch (err) {
        logger.error('Error prioritizing order:', err);
      }
    });

    socket.on("releaseOrder", async ({ orderId }) => {
      if (!orderId) return;
      try {
        await query(db, 'UPDATE orders SET status="active" WHERE id=?', [orderId]);
        // Re-broadcast as added to stations owning items in the order
        const fetchSql = `SELECT o.order_number, o.order_type, o.special_instructions, o.allergy, UNIX_TIMESTAMP(o.created_at) AS ts,
                             oi.quantity, mi.name, mi.station_id, mi.id AS item_id,
                             oi.special_instructions AS item_instructions, oi.allergy AS item_allergy,
                             GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                      FROM orders o
                      JOIN order_items oi ON o.id = oi.order_id
                      JOIN menu_items mi ON oi.menu_item_id = mi.id
                      LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                      LEFT JOIN modifiers m ON oim.modifier_id = m.id
                      WHERE o.id=?
                      GROUP BY oi.id
                      ORDER BY oi.id`;
        const [rows] = await query(db, fetchSql, [orderId]);
        if (!rows.length) return;
        const stationMap = {};
        rows.forEach((r) => {
          if (!stationMap[r.station_id]) stationMap[r.station_id] = [];
          stationMap[r.station_id].push({
            quantity: r.quantity,
            name: r.name,
            stationId: r.station_id,
            itemId: r.item_id,
            modifiers: r.modifiers ? r.modifiers.split(', ') : [],
            specialInstructions: r.item_instructions || '',
            allergy: !!r.item_allergy,
          });
        });
        const orderNumber = rows[0].order_number || orderId;
        const orderType = rows[0].order_type || '';
        const specialInstructions = rows[0].special_instructions || '';
        const allergy = !!rows[0].allergy;
        const createdTs = rows[0].ts;
        Object.keys(stationMap).forEach((id) => {
          io.to(`station-${id}`).emit('orderAdded', {
            orderId,
            orderNumber,
            orderType,
            specialInstructions,
            allergy,
            createdTs,
            items: stationMap[id],
          });
          sse && sse.emitToStation(id, 'orderAdded', {
            orderId,
            orderNumber,
            orderType,
            specialInstructions,
            allergy,
            createdTs,
            items: stationMap[id],
          });
        });
        io.to('expo').emit('orderReleased', { orderId });
        sse && sse.emitToExpo('orderReleased', { orderId });
      } catch (err) {
        logger.error('Error releasing order:', err);
      }
    });

    socket.on('clearReady', async () => {
      if (socket.stationType !== 'expo') return;
      try {
        const [rows] = await query(db, 'SELECT id, order_number FROM orders WHERE status="ready"');
        for (const r of rows) {
          await query(db, 'UPDATE orders SET status="completed" WHERE id=?', [r.id]);
          await query(
            db,
            `INSERT INTO bumped_orders (order_id, station_id, order_number)
                   VALUES (?, ?, ?)
                   ON DUPLICATE KEY UPDATE bumped_at=NOW(), order_number=VALUES(order_number)`,
            [r.id, socket.stationId, r.order_number || String(r.id)]
          );
          io.emit('orderCompleted', { orderId: r.id });
        }
        io.emit('reportsUpdated');
      } catch (err) {
        logger.error('Error clearing ready orders:', err);
      }
    });
  });
};
