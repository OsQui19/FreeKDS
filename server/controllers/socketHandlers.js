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
        }
      } catch (err) {
        logger.error("Error handling bumpOrder:", err);
      }
    });

    socket.on("recallOrder", async ({ orderId }) => {
      if (!orderId) return;
      try {
        await query(
          db,
          "DELETE FROM bumped_orders WHERE order_id=? AND station_id=?",
          [orderId, socket.stationId],
        );
        if (socket.stationType === "expo") {
          await query(
            db,
            'UPDATE orders SET status="active" WHERE id=?',
            [orderId],
          );
          io.emit("reportsUpdated");
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
          if (rows.length === 0) return;
          const stationMap = {};
          rows.forEach((r) => {
            if (!stationMap[r.station_id]) stationMap[r.station_id] = [];
            stationMap[r.station_id].push({
              quantity: r.quantity,
              name: r.name,
              stationId: r.station_id,
              itemId: r.item_id,
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
  });
};
