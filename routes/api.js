const express = require("express");
const {
  updateItemModifiers,
  getBumpedOrders,
  logInventoryForOrder,
  insertUnit,
  getUnits,
} = require("../controllers/dbHelpers");
const { backupDatabase } = require("../controllers/dbBackup");
const unitConversion = require("../controllers/unitConversion");
const bcrypt = require("bcrypt");
const accessControl = require("../controllers/accessControl");

module.exports = (db, io) => {
  const router = express.Router();

  router.post("/api/orders", async (req, res) => {
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

      try {
        await logInventoryForOrder(conn, orderId, items);
      } catch (err5) {
        console.error("Inventory log error:", err5);
        await conn.rollback();
        conn.release();
        return res.status(500).send("DB Error");
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
      backupDatabase();

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
      console.error("Error inserting order:", err);
      res.status(500).send("DB Error");
    } finally {
      if (conn) conn.release();
    }
  });

  router.get("/api/bumped_orders", (req, res) => {
    const stationId = parseInt(req.query.station_id, 10);
    const limit = parseInt(req.query.limit, 10) || 20;
    if (isNaN(stationId))
      return res.status(400).json({ error: "station_id required" });
    getBumpedOrders(
      db,
      stationId,
      (err, orders) => {
        if (err) {
          console.error("Error fetching bumped orders:", err);
          return res.status(500).send("DB Error");
        }
        res.json({ orders });
      },
      limit,
    );
  });

  router.get("/api/recipe", (req, res) => {
    const id = req.query.id;
    const name = req.query.name;
    if (!id && !name) return res.json({ recipe: null });
    const sql = id
      ? "SELECT recipe FROM menu_items WHERE id=? LIMIT 1"
      : "SELECT recipe FROM menu_items WHERE name=? LIMIT 1";
    const param = id ? id : name;
    db.query(sql, [param], (err, rows) => {
      if (err) {
        console.error("Error fetching recipe:", err);
        return res.status(500).send("DB Error");
      }
      if (rows.length) {
        res.json({ recipe: rows[0].recipe });
      } else {
        res.json({ recipe: null });
      }
    });
  });

  router.get("/api/units", async (req, res) => {
    try {
      const units = await getUnits(db);
      res.json({ units });
    } catch (err) {
      console.error("Error fetching units:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/api/units", async (req, res) => {
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
      console.error("Error inserting unit:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/api/employees", async (req, res) => {
    try {
      const [rows] = await db
        .promise()
        .query(
          "SELECT setting_value FROM settings WHERE setting_key='employees' LIMIT 1",
        );
      const employees = rows.length ? JSON.parse(rows[0].setting_value) : [];
      res.json({ employees });
    } catch (err) {
      console.error("Error fetching employees:", err);
      res.status(500).send("DB Error");
    }
  });

  const { hasLevel, getHierarchy, saveHierarchy } = require("../controllers/accessControl");

  router.post("/api/employees", async (req, res) => {
    const topRole = getHierarchy().slice(-1)[0];
    if (!req.session.user || !hasLevel(req.session.user.role, topRole)) {
      return res.status(403).send("Forbidden");
    }
    if (!Array.isArray(req.body.employees))
      return res.status(400).send("Invalid data");
    try {
      const employees = req.body.employees;
      await db
        .promise()
        .query(
          "INSERT INTO settings (setting_key, setting_value) VALUES ('employees', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
          [JSON.stringify(employees)],
        );

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
        const cols = ['username'];
        const vals = [emp.username];
        const updates = [];
        if (emp.password) {
          cols.push('password_hash');
          const hash = await bcrypt.hash(emp.password, 10);
          vals.push(hash);
          updates.push('password_hash=VALUES(password_hash)');
        }
        if (emp.pin) {
          cols.push('pin_hash');
          const pinHash = await bcrypt.hash(emp.pin, 10);
          vals.push(pinHash);
          updates.push('pin_hash=VALUES(pin_hash)');
        }
        cols.push('role');
        vals.push(role);
        if (updates.length) {
          updates.push('role=VALUES(role)');
          await db
            .promise()
            .query(
              `INSERT INTO employees (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
              vals,
            );
        } else {
          await db
            .promise()
            .query('UPDATE employees SET role=? WHERE username=?', [role, emp.username]);
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error saving employees:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/api/schedule", async (req, res) => {
    try {
      const [rows] = await db
        .promise()
        .query(
          "SELECT setting_value FROM settings WHERE setting_key='schedule' LIMIT 1",
        );
      const schedule = rows.length ? JSON.parse(rows[0].setting_value) : {};
      res.json({ schedule });
    } catch (err) {
      console.error("Error fetching schedule:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/api/schedule", async (req, res) => {
    if (!req.body.schedule || typeof req.body.schedule !== "object")
      return res.status(400).send("Invalid data");
    try {
      await db
        .promise()
        .query(
          "INSERT INTO settings (setting_key, setting_value) VALUES ('schedule', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
          [JSON.stringify(req.body.schedule)],
        );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving schedule:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/api/hierarchy", async (req, res) => {
    try {
      const roles = getHierarchy();
      res.json({ hierarchy: roles });
    } catch (err) {
      console.error("Error fetching hierarchy:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/api/hierarchy", async (req, res) => {
    const roles = Array.isArray(req.body.hierarchy) ? req.body.hierarchy : null;
    if (!roles) return res.status(400).send("Invalid data");
    const topRole = getHierarchy().slice(-1)[0];
    if (!req.session.user || !hasLevel(req.session.user.role, topRole)) {
      return res.status(403).send("Forbidden");
    }
    try {
      await new Promise((resolve, reject) =>
        saveHierarchy(db, roles, (err) => (err ? reject(err) : resolve())),
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving hierarchy:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/api/permissions", async (req, res) => {
    try {
      const perms = accessControl.getPermissions();
      res.json({ permissions: perms });
    } catch (err) {
      console.error("Error fetching permissions:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/api/modules", (req, res) => {
    res.json({ modules: accessControl.ALL_MODULES });
  });

  router.get("/api/time-clock", async (req, res) => {
    try {
      const [rows] = await db
        .promise()
        .query(
          `SELECT tc.*, e.username AS name FROM time_clock tc JOIN employees e ON tc.employee_id=e.id ORDER BY tc.id DESC LIMIT 100`
        );
      res.json({ records: rows });
    } catch (err) {
      console.error("Error fetching time clock:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/api/permissions", async (req, res) => {
    if (!req.body.permissions || typeof req.body.permissions !== "object")
      return res.status(400).send("Invalid data");
    const topRole = getHierarchy().slice(-1)[0];
    if (!req.session.user || !hasLevel(req.session.user.role, topRole)) {
      return res.status(403).send("Forbidden");
    }
    try {
      await new Promise((resolve, reject) =>
        accessControl.savePermissions(db, req.body.permissions, (err) =>
          err ? reject(err) : resolve(),
        ),
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving permissions:", err);
      res.status(500).send("DB Error");
    }
  });

  return router;
};
