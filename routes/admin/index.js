const express = require("express");
const logger = require("../../../utils/logger");
const { convert } = require("../../../controllers/unitConversion");
const {
  getIngredients,
  getUnits,
  getPurchaseOrderItems,
  receivePurchaseOrder,
<<<<<<< ours
} = require("../../controllers/db/inventory");
const { fetchSalesTotals, fetchIngredientUsage } = require("../../controllers/analytics");
const { getRolePermissions } = require("../../controllers/accessControl");
=======
} = require("../../../controllers/dbHelpers");
const { fetchSalesTotals, fetchIngredientUsage } = require("../../../controllers/analytics");
const { getRolePermissions } = require("../../../controllers/accessControl");
const itemsRoutes = require("./items");
>>>>>>> theirs

module.exports = (db, io) => {
  const router = express.Router();

  router.use("/admin/ingredients", itemsRoutes(db));

  router.post("/admin/item-categories", (req, res) => {
    const { id, name, parent_id } = req.body;
    if (!name) return res.redirect("/admin?tab=inventory");
    if (id) {
      db.query(
        "UPDATE item_categories SET name=?, parent_id=? WHERE id=?",
        [name, parent_id || null, id],
        (err) => {
          if (err) logger.error("Error updating item category:", err);
          res.redirect("/admin?tab=inventory&msg=Category+saved");
        },
      );
    } else {
      db.query(
        "INSERT INTO item_categories (name, parent_id) VALUES (?, ?)",
        [name, parent_id || null],
        (err) => {
          if (err) logger.error("Error inserting item category:", err);
          res.redirect("/admin?tab=inventory&msg=Category+saved");
        },
      );
    }
  });

  router.post("/admin/item-categories/delete", (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin?tab=inventory");
    db.query("DELETE FROM item_categories WHERE id=?", [id], (err) => {
      if (err) logger.error("Error deleting item category:", err);
      res.redirect("/admin?tab=inventory&msg=Category+deleted");
    });
  });

  router.post("/admin/tags", (req, res) => {
    const { id, name } = req.body;
    if (!name) return res.redirect("/admin?tab=inventory");
    if (id) {
      db.query("UPDATE tags SET name=? WHERE id=?", [name, id], (err) => {
        if (err) logger.error("Error updating tag:", err);
        res.redirect("/admin?tab=inventory&msg=Tag+saved");
      });
    } else {
      db.query("INSERT INTO tags (name) VALUES (?)", [name], (err) => {
        if (err) logger.error("Error inserting tag:", err);
        res.redirect("/admin?tab=inventory&msg=Tag+saved");
      });
    }
  });

  router.post("/admin/tags/delete", (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin?tab=inventory");
    db.query("DELETE FROM tags WHERE id=?", [id], (err) => {
      if (err) logger.error("Error deleting tag:", err);
      res.redirect("/admin?tab=inventory&msg=Tag+deleted");
    });
  });

  router.post("/admin/inventory/transactions", async (req, res) => {
    const ingredientId = req.body.ingredient_id;
    const type = req.body.type || "adjust";
    const qty = parseFloat(req.body.quantity);
    if (!ingredientId || isNaN(qty))
      return res.redirect("/admin?tab=inventory");

    let conn;
    try {
      conn = await db.promise().getConnection();
      await conn.beginTransaction();
      await conn.query(
        "INSERT INTO inventory_transactions (ingredient_id, type, quantity) VALUES (?, ?, ?)",
        [ingredientId, type, qty],
      );
      await conn.query(
        "UPDATE ingredients SET quantity = quantity + ? WHERE id=?",
        [qty, ingredientId],
      );
      await conn.commit();
      io.emit("reportsUpdated");
      res.redirect("/admin?tab=inventory&msg=Transaction+recorded");
    } catch (err) {
      if (conn) await conn.rollback();
      logger.error("Error recording transaction:", err);
      res.status(500).send("DB Error");
    } finally {
      if (conn) conn.release();
    }
  });

  router.get("/admin/inventory/stats", async (req, res) => {
    try {
      const { start, end } = req.query;
      const sales = await fetchSalesTotals(db, start, end);
      const usage = await fetchIngredientUsage(db, start, end);
      res.json({ sales, usage });
    } catch (err) {
      logger.error("Error fetching inventory stats:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  router.get("/admin/inventory/logs", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const fmt = (d) => `${d} 00:00:00`;
      const sql = `SELECT l.*, mi.name AS item_name, ing.name AS ingredient_name, u.abbreviation AS unit
                    FROM inventory_log l
                    JOIN menu_items mi ON l.menu_item_id = mi.id
                    JOIN ingredients ing ON l.ingredient_id = ing.id
                    LEFT JOIN units u ON ing.unit_id = u.id
                    WHERE l.created_at BETWEEN ? AND ?
                    ORDER BY l.id DESC`;
      const [logs] = await db
        .promise()
        .query(sql, [fmt(startDate), fmt(endDate)]);
      res.json({ logs });
    } catch (err) {
      logger.error("Error fetching inventory logs:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  router.post("/admin/inventory/logs", async (req, res) => {
    try {
      const { start, end } = req.body;
      if (!start || !end) return res.redirect("/admin?tab=inventory");
      const [rows] = await db.promise().query(
        `SELECT ingredient_id, SUM(amount) AS total
           FROM inventory_log
          WHERE created_at BETWEEN ? AND ?
          GROUP BY ingredient_id`,
        [start + " 00:00:00", end + " 23:59:59"],
      );
      for (const r of rows) {
        await db
          .promise()
          .query(
            "INSERT INTO daily_usage_log (start_date, end_date, ingredient_id, amount) VALUES (?, ?, ?, ?)",
            [start, end, r.ingredient_id, r.total],
          );
      }
      res.redirect("/admin?tab=inventory&msg=Usage+log+created");
    } catch (err) {
      logger.error("Error creating usage log:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/admin/inventory", (req, res) => {
    res.redirect("/admin?tab=inventory");
  });

  router.get("/admin/purchase-orders", (req, res) => {
    res.redirect("/admin?tab=purchase-orders");
  });

  router.post("/admin/purchase-orders/:id/receive", async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) return res.redirect("/admin/purchase-orders");
    try {
      const [items] = await db.promise().query(
        `SELECT poi.ingredient_id, poi.quantity, poi.unit_id, ing.unit_id AS ing_unit
           FROM purchase_order_items poi
           JOIN ingredients ing ON poi.ingredient_id = ing.id
          WHERE poi.purchase_order_id=?`,
        [orderId],
      );
      for (const it of items) {
        let qty = parseFloat(it.quantity);
        const conv = convert(qty, it.unit_id || it.ing_unit, it.ing_unit);
        if (conv !== null) qty = conv;
        await db
          .promise()
          .query("UPDATE ingredients SET quantity = quantity + ? WHERE id=?", [
            qty,
            it.ingredient_id,
          ]);
        await db
          .promise()
          .query(
            "INSERT INTO inventory_transactions (ingredient_id, type, quantity) VALUES (?, ?, ?)",
            [it.ingredient_id, "purchase", qty],
          );
      }
      await db
        .promise()
        .query('UPDATE purchase_orders SET status="received" WHERE id=?', [
          orderId,
        ]);
      res.redirect(`/admin/purchase-orders/${orderId}?msg=Order+received`);
    } catch (err) {
      logger.error("Error receiving order:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/purchase-order-items", async (req, res) => {
    const { purchase_order_id, ingredient_id, quantity, unit_id } = req.body;
    if (!purchase_order_id || !ingredient_id || !quantity)
      return res.redirect(`/admin/purchase-orders/${purchase_order_id}`);
    try {
      await db
        .promise()
        .query(
          "INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_id) VALUES (?, ?, ?, ?)",
          [purchase_order_id, ingredient_id, quantity, unit_id || null],
        );
      res.redirect(
        `/admin/purchase-orders/${purchase_order_id}?msg=Item+added`,
      );
    } catch (err) {
      logger.error("Error adding order item:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/purchase-order-items/delete", async (req, res) => {
    const { id, order_id } = req.body;
    if (!id) return res.redirect(`/admin/purchase-orders/${order_id}`);
    try {
      await db
        .promise()
        .query("DELETE FROM purchase_order_items WHERE id=?", [id]);
      res.redirect(`/admin/purchase-orders/${order_id}?msg=Item+deleted`);
    } catch (err) {
      logger.error("Error deleting order item:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/purchase-orders", (req, res) => {
    const supplier = req.body.supplier_id;
    const location = req.body.location_id || null;
    const date = req.body.order_date || new Date().toISOString().slice(0, 10);
    if (!supplier) return res.redirect("/admin/purchase-orders");
    db.query(
      "INSERT INTO purchase_orders (supplier_id, location_id, order_date) VALUES (?, ?, ?)",
      [supplier, location, date],
      (err) => {
        if (err) logger.error("Error inserting purchase order:", err);
        res.redirect("/admin/purchase-orders?msg=Order+created");
      },
    );
  });

  router.get("/admin/purchase-orders/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const orders = await db
        .promise()
        .query(
          `SELECT po.*, s.name AS supplier_name, l.name AS location_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id LEFT JOIN inventory_locations l ON po.location_id=l.id WHERE po.id=?`,
          [id],
        );
      if (!orders[0].length) return res.redirect("/admin/purchase-orders");
      const order = orders[0][0];
      const items = await getPurchaseOrderItems(db, id);
      const ingredients = await getIngredients(db);
      const units = await getUnits(db);
      const allowedModules = getRolePermissions(req.session.user.role);
      res.render("admin/purchase_order_detail", {
        order,
        items,
        ingredients,
        units,
        allowedModules,
        settings: res.locals.settings || {},
      });
    } catch (err) {
      logger.error("Error fetching order detail:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/admin/suppliers", (req, res) => {
    res.redirect("/admin?tab=suppliers");
  });

  router.post("/admin/suppliers", async (req, res) => {
    const { id, name, contact_info } = req.body;
    if (!name) return res.redirect("/admin/suppliers");
    try {
      if (id) {
        await db
          .promise()
          .query("UPDATE suppliers SET name=?, contact_info=? WHERE id=?", [
            name,
            contact_info || null,
            id,
          ]);
      } else {
        await db
          .promise()
          .query("INSERT INTO suppliers (name, contact_info) VALUES (?, ?)", [
            name,
            contact_info || null,
          ]);
      }
      res.redirect("/admin/suppliers?msg=Supplier+saved");
    } catch (err) {
      logger.error("Error saving supplier:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/purchase-orders/:id/receive", async (req, res) => {
    const id = req.params.id;
    try {
      await receivePurchaseOrder(db, id);
      res.redirect(`/admin/purchase-orders/${id}?msg=Order+received`);
      io.emit("reportsUpdated");
    } catch (err) {
      logger.error("Error receiving order:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/suppliers/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin/suppliers");
    try {
      await db.promise().query("DELETE FROM suppliers WHERE id=?", [id]);
      res.redirect("/admin/suppliers?msg=Supplier+deleted");
    } catch (err) {
      logger.error("Error deleting supplier:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/purchase-orders/delete", (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect("/admin/purchase-orders");
    db.query("DELETE FROM purchase_orders WHERE id=?", [id], (err) => {
      if (err) logger.error("Error deleting order:", err);
      res.redirect("/admin/purchase-orders?msg=Order+deleted");
    });
  });

  router.post("/admin/purchase-order-items", (req, res) => {
    const orderId = req.body.purchase_order_id;
    const ingredient = req.body.ingredient_id;
    const qty = parseFloat(req.body.quantity);
    const unitId = req.body.unit_id || null;
    if (!orderId || !ingredient || isNaN(qty))
      return res.redirect("/admin/purchase-orders");
    db.query(
      "INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_id) VALUES (?, ?, ?, ?)",
      [orderId, ingredient, qty, unitId],
      (err) => {
        if (err) logger.error("Error inserting PO item:", err);
        res.redirect(`/admin/purchase-orders/${orderId}`);
      },
    );
  });

  router.post("/admin/purchase-order-items/delete", (req, res) => {
    const id = req.body.id;
    const orderId = req.body.order_id;
    if (!id) return res.redirect("/admin/purchase-orders");
    db.query("DELETE FROM purchase_order_items WHERE id=?", [id], (err) => {
      if (err) logger.error("Error deleting PO item:", err);
      res.redirect(`/admin/purchase-orders/${orderId}`);
    });
  });

  router.get("/admin/locations", (req, res) => {
    res.redirect("/admin?tab=locations");
  });

  router.post("/admin/locations", async (req, res) => {
    const { id, name } = req.body;
    if (!name) return res.redirect("/admin/locations");
    try {
      if (id) {
        await db
          .promise()
          .query("UPDATE inventory_locations SET name=? WHERE id=?", [
            name,
            id,
          ]);
      } else {
        await db
          .promise()
          .query("INSERT INTO inventory_locations (name) VALUES (?)", [name]);
      }
      res.redirect("/admin/locations?msg=Location+saved");
    } catch (err) {
      logger.error("Error saving location:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/locations/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin/locations");
    try {
      await db
        .promise()
        .query("DELETE FROM inventory_locations WHERE id=?", [id]);
      res.redirect("/admin/locations?msg=Location+deleted");
    } catch (err) {
      logger.error("Error deleting location:", err);
      res.status(500).send("DB Error");
    }
  });

  return router;
};

