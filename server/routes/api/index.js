const logger = require("../../../utils/logger");
const express = require("express");
const { getBumpedOrders } = require("../../controllers/db/orders");
const {
  logInventoryForOrder,
  insertUnit,
  getUnits,
} = require("../../controllers/db/inventory");
const { updateMenuItem } = require("../../controllers/db/menu");
const { backupDatabase } = require("../../controllers/dbBackup");
const unitConversion = require("../../controllers/unitConversion");
const bcrypt = require("bcrypt");
const accessControl = require("../../controllers/accessControl");
const { pinLookup } = require("../../../utils/pin");

module.exports = (db, io) => {
  const router = express.Router();

  router.post("/api/orders", async (req, res, next) => {
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
  router.get("/api/bumped_orders", async (req, res) => {
    try {
      const stationId = parseInt(req.query.station_id, 10);
      const limit = parseInt(req.query.limit, 10) || 20;
      if (isNaN(stationId))
        return res.status(400).json({ error: "station_id required" });
      const orders = await getBumpedOrders(db, stationId, limit);
      res.json({ orders });
    } catch (err) {
      logger.error("Error fetching bumped orders:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  router.get("/api/recipe", async (req, res, next) => {
    try {
      const id = req.query.id;
      const name = req.query.name;
      if (!id && !name) return res.json({ recipe: null });
      const sql = id
        ? "SELECT recipe FROM menu_items WHERE id=? LIMIT 1"
        : "SELECT recipe FROM menu_items WHERE name=? LIMIT 1";
      const param = id ? id : name;
      const [rows] = await db.promise().query(sql, [param]);
      if (rows.length) {
        res.json({ recipe: rows[0].recipe });
      } else {
        res.json({ recipe: null });
      }
    } catch (err) {
      logger.error("Error fetching recipe:", err);
      next(err);
    }
  });

  router.get("/api/units", async (req, res, next) => {
    try {
      const units = await getUnits(db);
      res.json({ units });
    } catch (err) {
      logger.error("Error fetching units:", err);
      next(err);
    }
  });

  router.post("/api/units", async (req, res, next) => {
    const { name, abbreviation, type, to_base } = req.body;
    const toBase = parseFloat(to_base);
    if (!name || !abbreviation || !type || isNaN(toBase)) {
      return res.status(400).send("Invalid unit data");
    }
    try {
      const id = await insertUnit(db, {
        name,
        abbreviation,
        type,
        toBase,
      });
      unitConversion.loadUnits(db);
      res.json({ success: true, id });
    } catch (err) {
      logger.error("Error inserting unit:", err);
      next(err);
    }
  });

  router.get("/api/employees", async (req, res, next) => {
    try {
      const [empRows] = await db
        .promise()
        .query(
          "SELECT id, first_name, last_name, position, start_date, email, phone, wage_rate, username, role FROM employees",
        );
      const employees = empRows.map((r) => ({
        id: r.id,
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username,
        position: r.position || "",
        start_date: r.start_date
          ? r.start_date.toISOString().split("T")[0]
          : "",
        email: r.email || "",
        phone: r.phone || "",
        wage_rate: r.wage_rate != null ? String(r.wage_rate) : "",
        username: r.username,
        role: r.role,
      }));
      res.json({ employees });
    } catch (err) {
      logger.error("Error fetching employees:", err);
      next(err);
    }
  });

  const {
    hasLevel,
    getHierarchy,
    saveHierarchy,
  } = require("../../controllers/accessControl");

  router.post("/api/employees", async (req, res, next) => {
    const topRole = getHierarchy().slice(-1)[0];
    if (!req.session.user || !hasLevel(req.session.user.role, topRole)) {
      return res.status(403).send("Forbidden");
    }
    if (!Array.isArray(req.body.employees))
      return res.status(400).send("Invalid data");
    try {
      const employees = req.body.employees;

      const allowedRoles = getHierarchy();
      const roleMap = {};
      allowedRoles.forEach((r) => {
        roleMap[accessControl.normalizeRole(r)] = r;
      });
      for (const emp of employees) {
        if (!emp.username) continue;
        const norm = accessControl.normalizeRole(emp.role);
        let role = roleMap[norm] || allowedRoles[0];
        if (
          hasLevel(role, topRole) &&
          !hasLevel(req.session.user.role, topRole)
        ) {
          role = allowedRoles[0];
        }
        const cols = [
          "username",
          "role",
          "first_name",
          "last_name",
          "position",
          "start_date",
          "email",
          "phone",
          "wage_rate",
        ];
        const vals = [
          emp.username,
          role,
          emp.first_name || null,
          emp.last_name || null,
          emp.position || null,
          emp.start_date || null,
          emp.email || null,
          emp.phone || null,
          emp.wage_rate || null,
        ];
        const updates = [
          "role=VALUES(role)",
          "first_name=VALUES(first_name)",
          "last_name=VALUES(last_name)",
          "position=VALUES(position)",
          "start_date=VALUES(start_date)",
          "email=VALUES(email)",
          "phone=VALUES(phone)",
          "wage_rate=VALUES(wage_rate)",
        ];
        if (emp.password) {
          cols.push("password_hash");
          const hash = await bcrypt.hash(emp.password, 10);
          vals.push(hash);
          updates.push("password_hash=VALUES(password_hash)");
        }
        if (emp.pin) {
          cols.push("pin_hash");
          cols.push("pin_lookup");
          const pinHash = await bcrypt.hash(emp.pin, 10);
          vals.push(pinHash);
          vals.push(pinLookup(emp.pin));
          updates.push("pin_hash=VALUES(pin_hash)");
          updates.push("pin_lookup=VALUES(pin_lookup)");
        }
        await db
          .promise()
          .query(
            `INSERT INTO employees (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
            vals,
          );
      }

      res.json({ success: true });
    } catch (err) {
      logger.error("Error saving employees:", err);
      next(err);
    }
  });

  router.get("/api/schedule", async (req, res, next) => {
    try {
      let [rows] = await db
        .promise()
        .query(
          "SELECT id, employee_id, start_time, end_time, week_key FROM employee_schedule",
        );
      if (rows.length === 0) {
        const [oldRows] = await db
          .promise()
          .query(
            "SELECT setting_value FROM settings WHERE setting_key='schedule' LIMIT 1",
          );
        if (oldRows.length) {
          const legacy = JSON.parse(oldRows[0].setting_value || "{}");
          const inserts = [];
          for (const [week, days] of Object.entries(legacy)) {
            for (const [day, arr] of Object.entries(days || {})) {
              (arr || []).forEach((r) => {
                const base = new Date(week);
                base.setDate(base.getDate() + parseInt(day, 10));
                const s = new Date(base);
                s.setHours(r.start, 0, 0, 0);
                const e = new Date(base);
                e.setHours(r.end, 0, 0, 0);
                inserts.push([r.id, s, e, week]);
              });
            }
          }
          if (inserts.length) {
            await db
              .promise()
              .query(
                "INSERT INTO employee_schedule (employee_id, start_time, end_time, week_key) VALUES ?",
                [inserts],
              );
          }
          await db
            .promise()
            .query("DELETE FROM settings WHERE setting_key='schedule'");
          [rows] = await db
            .promise()
            .query(
              "SELECT id, employee_id, start_time, end_time, week_key FROM employee_schedule",
            );
        }
      }
      res.json({ schedule: rows });
    } catch (err) {
      logger.error("Error fetching schedule:", err);
      next(err);
    }
  });

  router.post("/api/schedule", async (req, res, next) => {
    if (!Array.isArray(req.body.schedule))
      return res.status(400).send("Invalid data");

    // Basic validation to avoid corrupt data being saved
    for (const r of req.body.schedule) {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return res.status(400).send("Invalid shift times");
      }
    }

    // Detect overlapping shifts per employee
    const byEmp = {};
    for (const r of req.body.schedule) {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      if (!byEmp[r.employee_id]) byEmp[r.employee_id] = [];
      byEmp[r.employee_id].push({ start, end });
    }
    for (const list of Object.values(byEmp)) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        if (list[i].start < list[i - 1].end)
          return res.status(400).send("Overlap detected");
      }
    }

    let conn;
    try {
      conn = await db.promise().getConnection();
      await conn.beginTransaction();

      // Only replace the weeks included in the request
      const weeks = [...new Set(req.body.schedule.map((s) => s.week_key))];
      for (const wk of weeks) {
        await conn.query("DELETE FROM employee_schedule WHERE week_key = ?", [
          wk,
        ]);
      }

      if (req.body.schedule.length) {
        const values = req.body.schedule.map((s) => [
          s.employee_id,
          new Date(s.start_time),
          new Date(s.end_time),
          s.week_key,
        ]);
        await conn.query(
          "INSERT INTO employee_schedule (employee_id, start_time, end_time, week_key) VALUES ?",
          [values],
        );
      }

      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      if (conn) await conn.rollback();
      logger.error("Error saving schedule:", err);
      next(err);
    } finally {
      if (conn) conn.release();
    }
  });
  router.get("/api/hierarchy", async (req, res, next) => {
    try {
      const roles = getHierarchy();
      res.json({ hierarchy: roles });
    } catch (err) {
      logger.error("Error fetching hierarchy:", err);
      next(err);
    }
  });

  router.post("/api/hierarchy", async (req, res, next) => {
    const roles = Array.isArray(req.body.hierarchy) ? req.body.hierarchy : null;
    if (!roles) return res.status(400).send("Invalid data");
    const topRole = getHierarchy().slice(-1)[0];
    if (!req.session.user || !hasLevel(req.session.user.role, topRole)) {
      return res.status(403).send("Forbidden");
    }
    try {
      await saveHierarchy(db, roles);
      res.json({ success: true });
    } catch (err) {
      logger.error("Error saving hierarchy:", err);
      next(err);
    }
  });

  router.get("/api/permissions", async (req, res, next) => {
    try {
      const perms = accessControl.getPermissions();
      res.json({ permissions: perms });
    } catch (err) {
      logger.error("Error fetching permissions:", err);
      next(err);
    }
  });

  router.get("/api/modules", (req, res) => {
    res.json({
      modules: accessControl.ALL_MODULES,
      groups: accessControl.MODULE_GROUPS,
    });
  });

  router.put("/api/menu-items/:id", async (req, res, next) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const role = req.session.user.role;
    const canEditMenu = accessControl.roleHasAccess(role, "menu");
    const canEightySix =
      canEditMenu || accessControl.roleHasAccess(role, "order");
    if (!canEightySix) {
      return res.status(403).send("Forbidden");
    }
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).send("Invalid id");
    const {
      price,
      stock,
      stock_count,
      available,
      available_qty,
      is_available,
    } = req.body;
    const stockVal = stock ?? stock_count ?? available_qty;
    const avail = is_available ?? available;
    const updateFields = {};
    if (canEditMenu && price !== undefined) {
      updateFields.price = Number(price);
    }
    if (stock !== undefined) updateFields.stock = stock;
    if (stock_count !== undefined) updateFields.stock_count = stock_count;
    if (available_qty !== undefined) updateFields.available_qty = available_qty;
    if (avail !== undefined) updateFields.is_available = avail ? 1 : 0;
    try {
      await updateMenuItem(db, id, updateFields);
      if (
        (stockVal !== undefined && parseInt(stockVal, 10) <= 0) ||
        (updateFields.is_available !== undefined && !updateFields.is_available)
      ) {
        io.emit("menuItemsUpdated");
      }
      res.json({ success: true });
    } catch (err) {
      logger.error("Error updating menu item:", err);
      next(err);
    }
  });

  router.get("/api/time-clock", async (req, res, next) => {
    try {
      const [rows] = await db
        .promise()
        .query(
          `SELECT tc.*, e.username AS name FROM time_clock tc JOIN employees e ON tc.employee_id=e.id ORDER BY tc.id DESC LIMIT 100`,
        );
      res.json({ records: rows });
    } catch (err) {
      logger.error("Error fetching time clock:", err);
      next(err);
    }
  });

  router.put("/api/time-clock/:id", async (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).send("Invalid id");
    const start = new Date(req.body.clock_in);
    const end = req.body.clock_out ? new Date(req.body.clock_out) : null;
    if (
      !req.body.clock_in ||
      Number.isNaN(start) ||
      (req.body.clock_out && Number.isNaN(end))
    ) {
      return res.status(400).send("Invalid data");
    }
    if (end && end <= start) return res.status(400).send("Invalid range");
    try {
      await db
        .promise()
        .query("UPDATE time_clock SET clock_in=?, clock_out=? WHERE id=?", [
          start,
          end,
          id,
        ]);
      const [rows] = await db
        .promise()
        .query(
          "SELECT tc.*, e.username AS name FROM time_clock tc JOIN employees e ON tc.employee_id=e.id WHERE tc.id=?",
          [id],
        );
      if (rows.length) io.emit("timeUpdated", rows[0]);
      res.json({ success: true, record: rows[0] || null });
    } catch (err) {
      logger.error("Error updating time clock:", err);
      next(err);
    }
  });

  router.get("/api/payroll", async (req, res, next) => {
    try {
      const [rows] = await db.promise().query(
        `SELECT e.username AS name,
                  DATE_SUB(DATE(tc.clock_in), INTERVAL (DAYOFWEEK(tc.clock_in)+5)%7 DAY) AS period_start,
                  SUM(TIMESTAMPDIFF(MINUTE, tc.clock_in, COALESCE(tc.clock_out, NOW())))/60 AS hours
           FROM time_clock tc
           JOIN employees e ON tc.employee_id=e.id
           GROUP BY e.id, period_start
           ORDER BY e.username, period_start`,
      );
      res.json({ payroll: rows });
    } catch (err) {
      logger.error("Error fetching payroll data:", err);
      next(err);
    }
  });

  router.post("/api/permissions", async (req, res, next) => {
    if (!req.body.permissions || typeof req.body.permissions !== "object")
      return res.status(400).send("Invalid data");
    const topRole = getHierarchy().slice(-1)[0];
    if (!req.session.user || !hasLevel(req.session.user.role, topRole)) {
      return res.status(403).send("Forbidden");
    }
    try {
      await accessControl.savePermissions(db, req.body.permissions);
      res.json({ success: true });
    } catch (err) {
      logger.error("Error saving permissions:", err);
      next(err);
    }
  });

  return router;
};
