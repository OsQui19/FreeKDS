const express = require("express");
const logger = require("../../../../utils/logger");
const itemsRoutes = require("./items");
const {
  getPurchaseOrderItems,
  receivePurchaseOrder,
  getUnits,
  getIngredients,
} = require("../../../controllers/db/inventory");

module.exports = (db) => {
  const router = express.Router();

  // ingredient routes
  router.use("/admin/ingredients", itemsRoutes(db));

  // supplier routes
  router.post("/admin/suppliers", async (req, res) => {
    const { id, name, contact_info } = req.body;
    if (!name) return res.redirect("/admin?tab=inventory");
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
      res.redirect("/admin?tab=inventory&msg=Supplier+saved");
    } catch (err) {
      logger.error("Error saving supplier:", err);
      res.redirect("/admin?tab=inventory");
    }
  });

  router.post("/admin/suppliers/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin?tab=inventory");
    try {
      await db.promise().query("DELETE FROM suppliers WHERE id=?", [id]);
      res.redirect("/admin?tab=inventory&msg=Supplier+deleted");
    } catch (err) {
      logger.error("Error deleting supplier:", err);
      res.redirect("/admin?tab=inventory");
    }
  });

  // purchase order routes
  router.post("/admin/purchase-orders", async (req, res) => {
    const { order_date, supplier_id, location_id } = req.body;
    if (!order_date || !supplier_id)
      return res.redirect("/admin?tab=inventory");
    try {
      const [result] = await db
        .promise()
        .query(
          "INSERT INTO purchase_orders (order_date, supplier_id, location_id) VALUES (?, ?, ?)",
          [order_date, supplier_id, location_id || null],
        );
      res.redirect(`/admin/purchase-orders/${result.insertId}`);
    } catch (err) {
      logger.error("Error creating purchase order:", err);
      res.redirect("/admin?tab=inventory");
    }
  });

  router.post("/admin/purchase-orders/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin?tab=inventory");
    try {
      await db.promise().query("DELETE FROM purchase_orders WHERE id=?", [id]);
      res.redirect("/admin?tab=inventory&msg=Order+deleted");
    } catch (err) {
      logger.error("Error deleting purchase order:", err);
      res.redirect("/admin?tab=inventory");
    }
  });

  router.get("/admin/purchase-orders/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const [orders] = await db
        .promise()
        .query(
          `SELECT po.*, s.name AS supplier_name, l.name AS location_name
             FROM purchase_orders po
             LEFT JOIN suppliers s ON po.supplier_id = s.id
             LEFT JOIN inventory_locations l ON po.location_id = l.id
            WHERE po.id=?`,
          [id],
        );
      if (!orders.length) return res.status(404).send("Not found");
      const order = orders[0];
      const [items, ingredients, units] = await Promise.all([
        getPurchaseOrderItems(db, id),
        getIngredients(db),
        getUnits(db),
      ]);
      res.json({
        order,
        items,
        ingredients,
        units,
      });
    } catch (err) {
      logger.error("Error fetching purchase order:", err);
      res.status(500).send("Server Error");
    }
  });

  router.post("/admin/purchase-orders/:id/receive", async (req, res) => {
    const { id } = req.params;
    try {
      await receivePurchaseOrder(db, id);
      res.redirect(`/admin/purchase-orders/${id}?msg=Order+received`);
    } catch (err) {
      logger.error("Error receiving purchase order:", err);
      res.status(500).send("Server Error");
    }
  });

  // purchase order items
  router.post('/admin/purchase-orders/:id/items', async (req, res) => {
    const poId = parseInt(req.params.id, 10);
    const ingredientId = parseInt(req.body.ingredient_id, 10);
    const unitId = req.body.unit_id ? parseInt(req.body.unit_id, 10) : null;
    const quantity = parseFloat(req.body.quantity) || 0;
    if (!poId || !ingredientId || quantity <= 0) {
      return res.status(400).send('Invalid data');
    }
    try {
      await db.promise().query(
        'INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_id) VALUES (?, ?, ?, ?)',
        [poId, ingredientId, quantity, unitId]
      );
      res.json({ success: true });
    } catch (err) {
      logger.error('Error adding PO item:', err);
      res.status(500).send('Server Error');
    }
  });

  router.post('/admin/purchase-orders/:id/items/:itemId', async (req, res) => {
    const poId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const quantity = req.body.quantity != null ? parseFloat(req.body.quantity) : null;
    const unitId = req.body.unit_id != null ? parseInt(req.body.unit_id, 10) : null;
    if (!poId || !itemId) return res.status(400).send('Invalid id');
    const fields = [];
    const vals = [];
    if (quantity != null && !Number.isNaN(quantity)) { fields.push('quantity=?'); vals.push(quantity); }
    if (unitId != null && !Number.isNaN(unitId)) { fields.push('unit_id=?'); vals.push(unitId); }
    if (!fields.length) return res.status(400).send('No changes');
    vals.push(itemId, poId);
    try {
      await db.promise().query(
        `UPDATE purchase_order_items SET ${fields.join(', ')} WHERE id=? AND purchase_order_id=?`,
        vals
      );
      res.json({ success: true });
    } catch (err) {
      logger.error('Error updating PO item:', err);
      res.status(500).send('Server Error');
    }
  });

  router.post('/admin/purchase-orders/:id/items/:itemId/delete', async (req, res) => {
    const poId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    if (!poId || !itemId) return res.status(400).send('Invalid id');
    try {
      await db.promise().query('DELETE FROM purchase_order_items WHERE id=? AND purchase_order_id=?', [itemId, poId]);
      res.json({ success: true });
    } catch (err) {
      logger.error('Error deleting PO item:', err);
      res.status(500).send('Server Error');
    }
  });

  return router;
};
