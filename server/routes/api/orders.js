const express = require("express");
const logger = require("../../../utils/logger");
const { logInventoryForOrder } = require("../../controllers/dbHelpers");
const { backupDatabase } = require("../../controllers/dbBackup");

module.exports = (db, io) => {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    const { order_number, order_type, items, special_instructions, allergy } =
      req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    let conn;
    try {
      conn = await db.promise().getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        "INSERT INTO orders (order_number, order_type, special_instructions, allergy) VALUES (?, ?, ?, ?)",
        [
          order_number || null,
          order_type || null,
          special_instructions || null,
          allergy ? 1 : 0,
        ],
      );
      const orderId = result.insertId;

      const orderItemInfo = [];
      for (const it of items) {
        if (!it.menu_item_id || !it.quantity) continue;
        const [res2] = await conn.query(
          "INSERT INTO order_items (order_id, menu_item_id, quantity, special_instructions, allergy) VALUES (?, ?, ?, ?, ?)",
          [
            orderId,
            it.menu_item_id,
            it.quantity,
            it.special_instructions || null,
            it.allergy ? 1 : 0,
          ],
        );
        orderItemInfo.push({
          id: res2.insertId,
          modifier_ids: it.modifier_ids,
        });
      }

      const modValues = [];
      orderItemInfo.forEach((oi) => {
        if (Array.isArray(oi.modifier_ids)) {
          oi.modifier_ids.forEach((mid) => {
            modValues.push([oi.id, mid]);
          });
        }
      });

      if (modValues.length) {
        await conn.query(
          "INSERT INTO order_item_modifiers (order_item_id, modifier_id) VALUES ?",
          [modValues],
        );
      }

      let outOfStock = [];
      try {
        outOfStock = await logInventoryForOrder(conn, orderId, items);
      } catch (err5) {
        logger.error("Inventory log error:", err5);
        await conn.rollback();
        conn.release();
        return next(err5);
      }

      const fetchSql = `SELECT oi.id AS order_item_id, oi.quantity, mi.name, mi.station_id,
                                oi.special_instructions, oi.allergy,
                                GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                                FROM order_items oi
                                JOIN menu_items mi ON oi.menu_item_id = mi.id
                                LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                                LEFT JOIN modifiers m ON oim.modifier_id = m.id
                                WHERE oi.order_id=?
                                GROUP BY oi.id`;

      const [rows] = await conn.query(fetchSql, [orderId]);
      await conn.commit();
      backupDatabase(db);
      if (outOfStock.length) io.emit("menuItemsUpdated");

      const stationMap = {};
      rows.forEach((r) => {
        if (!stationMap[r.station_id]) stationMap[r.station_id] = [];
        stationMap[r.station_id].push({
          quantity: r.quantity,
          name: r.name,
          stationId: r.station_id,
          modifiers: r.modifiers ? r.modifiers.split(", ") : [],
          specialInstructions: r.special_instructions || "",
          allergy: !!r.allergy,
        });
      });
      const createdTs = Math.floor(Date.now() / 1000);
      Object.keys(stationMap).forEach((id) => {
        io.to(`station-${id}`).emit("orderAdded", {
          orderId,
          orderNumber: order_number || orderId,
          orderType: order_type || "",
          specialInstructions: special_instructions || "",
          allergy: !!allergy,
          createdTs,
          items: stationMap[id],
        });
      });
      io.to("expo").emit("orderAdded", {
        orderId,
        orderNumber: order_number || orderId,
        orderType: order_type || "",
        specialInstructions: special_instructions || "",
        allergy: !!allergy,
        createdTs,
        items: rows.map((r) => ({
          quantity: r.quantity,
          name: r.name,
          stationId: r.station_id,
          modifiers: r.modifiers ? r.modifiers.split(", ") : [],
          specialInstructions: r.special_instructions || "",
          allergy: !!r.allergy,
        })),
      });

      io.emit("reportsUpdated");

      res.json({ success: true, orderId });
    } catch (err) {
      if (conn) await conn.rollback();
      logger.error("Error inserting order:", err);
      next(err);
    } finally {
      if (conn) conn.release();
    }
  });

  return router;
};
