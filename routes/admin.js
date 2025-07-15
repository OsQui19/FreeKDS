const express = require("express");
const {
  updateItemModifiers,
  updateItemGroups,
  getMenuData,
  getStations,
  getIngredients,
  getUnits,
  getItemCategories,
  getTags,
  updateItemIngredients,
  getSuppliers,
  getLocations,
  getPurchaseOrders,
  getPurchaseOrderItems,
  receivePurchaseOrder,
} = require("../controllers/dbHelpers");
const {
  fetchSalesTotals,
  fetchIngredientUsage,
  fetchTopMenuItems,
  fetchCategorySales,
  fetchLowStockIngredients,
  fetchAverageBumpTimes,
} = require("../controllers/analytics");
const settingsCache = require("../controllers/settingsCache");
const { convert } = require("../controllers/unitConversion");
const { logSecurityEvent } = require("../controllers/securityLog");
const { validateSettings } = require("../utils/validateSettings");
const path = require("path");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const { execSync } = require("child_process");
const upload = multer({ dest: os.tmpdir() });
const {
  listBackups,
  restoreDatabase,
  backupDatabase,
  deleteBackup,
  getBackupDir,
  setBackupDir,
} = require("../controllers/dbBackup");

module.exports = (db, io) => {
  const router = express.Router();
  const {
    hasLevel,
    getHierarchy,
    roleHasAccess,
    getRolePermissions,
    ALL_MODULES,
  } = require("../controllers/accessControl");

  router.use((req, res, next) => {
    if (!req.path.startsWith("/admin")) return next();
    if (req.session.pinOnly) {
      logSecurityEvent(
        db,
        "unauthorized",
        req.session.user && req.session.user.id,
        req.originalUrl,
        false,
        req.ip,
      );
      return res.status(403).send("Forbidden");
    }
    if (!req.session.user) return next();
    const role = req.session.user.role;
    const topRole = getHierarchy().slice(-1)[0];
    const map = {
      "/admin/stations": "stations",
      "/admin/menu": "menu",
      "/admin/theme": "theme",
      "/admin/inventory": "inventory",
      "/admin/suppliers": "inventory",
      "/admin/purchase-orders": "inventory",
      "/admin/reports": "reports",
      "/admin/locations": "locations",
      "/admin/backups": "backup",
      "/admin/updates": "updates",
    };
    const comp = Object.entries(map).find(([p]) => req.path.startsWith(p));
    if (comp) {
      const c = comp[1];
      if (!roleHasAccess(role, c)) {
        logSecurityEvent(
          db,
          "unauthorized",
          req.session.user.id,
          req.originalUrl,
          false,
          req.ip,
        );
        return res.status(403).send("Forbidden");
      }
    } else if (req.path === "/admin" || req.path === "/admin/") {
      const allowed = getRolePermissions(role);
      if (!allowed.length && !hasLevel(role, topRole)) {
        logSecurityEvent(
          db,
          "unauthorized",
          req.session.user.id,
          req.originalUrl,
          false,
          req.ip,
        );
        return res.status(403).send("Forbidden");
      }
    } else if (!hasLevel(role, topRole)) {
      logSecurityEvent(
        db,
        "unauthorized",
        req.session.user.id,
        req.originalUrl,
        false,
        req.ip,
      );
      return res.status(403).send("Forbidden");
    }
    next();
  });
  router.get("/admin", async (req, res) => {
    try {
      const {
        categories,
        stations: menuStations,
        mods,
        modGroups,
        ingredients: publicIngredients,
        units,
      } = await getMenuData(db);
      const stationRows = await getStations(db);
      const allIngredients = await getIngredients(db);
      const itemCategories = await getItemCategories(db);
      const tags = await getTags(db);
      const unitRows = await getUnits(db);
      const [logRows] = await db.promise()
        .query(`SELECT l.*, mi.name AS item_name, ing.name AS ingredient_name, u.abbreviation AS unit
                                                FROM inventory_log l
                                                JOIN menu_items mi ON l.menu_item_id = mi.id
                                                JOIN ingredients ing ON l.ingredient_id = ing.id
                                                LEFT JOIN units u ON ing.unit_id = u.id
                                                ORDER BY l.id DESC LIMIT 100`);
      const [transactions] = await db.promise()
        .query(`SELECT t.*, ing.name AS ingredient_name, u.abbreviation AS unit
                                                      FROM inventory_transactions t
                                                      JOIN ingredients ing ON t.ingredient_id = ing.id
                                                      LEFT JOIN units u ON ing.unit_id = u.id
                                                      ORDER BY t.id DESC LIMIT 100`);
      const summarySql = `SELECT ing.id AS ingredient_id, ing.name, u.abbreviation AS unit, SUM(d.amount) AS total
                          FROM daily_usage_log d
                          JOIN ingredients ing ON d.ingredient_id = ing.id
                          LEFT JOIN units u ON ing.unit_id = u.id
                          GROUP BY ing.id
                          ORDER BY ing.name`;
      const [summary] = await db.promise().query(summarySql);

      const suppliers = await getSuppliers(db);
      const locations = await getLocations(db);
      const orders = await getPurchaseOrders(db);

      const settings = res.locals.settings || {};
      const allowedModules = getRolePermissions(req.session.user.role);
      res.render("admin/home", {
        stations: stationRows,
        categories,
        stationsMenu: menuStations,
        mods,
        modGroups,
        ingredients: allIngredients,
        itemCategories,
        tags,
        publicIngredients,
        logs: logRows,
        summary,
        transactions,
        units: unitRows,
        suppliers,
        locations,
        orders,
        settings,
        allowedModules,
        modules: ALL_MODULES,
      });
    } catch (err) {
      console.error("Error fetching admin page data:", err);
      res.status(500).send("DB Error");
    }
  });
  router.get("/admin/menu", (req, res) => {
    res.redirect("/admin?tab=menu");
  });

  router.post("/admin/items", async (req, res) => {
    const wantsJSON =
      req.headers.accept && req.headers.accept.includes("application/json");
    const id = req.body.id;
    const name = req.body.name;
    const price = parseFloat(req.body.price) || 0;
    const stationId = req.body.station_id;
    const categoryId = req.body.category_id;
    const recipe = req.body.recipe ? req.body.recipe.trim() : "";
    const imageUrl =
      req.body.image_url && req.body.image_url.trim() !== ""
        ? req.body.image_url.trim()
        : null;
    let itemIngredients = [];
    if (req.body.ingredient_ids && req.body.ingredient_amounts) {
      const ids = Array.isArray(req.body.ingredient_ids)
        ? req.body.ingredient_ids
        : [req.body.ingredient_ids];
      const amts = Array.isArray(req.body.ingredient_amounts)
        ? req.body.ingredient_amounts
        : [req.body.ingredient_amounts];
      const unitIds = req.body.ingredient_unit_ids
        ? Array.isArray(req.body.ingredient_unit_ids)
          ? req.body.ingredient_unit_ids
          : [req.body.ingredient_unit_ids]
        : [];
      itemIngredients = ids
        .map((id, idx) => ({
          ingredient_id: parseInt(id, 10),
          amount: parseFloat(amts[idx] || 0),
          unit_id: unitIds[idx] ? parseInt(unitIds[idx], 10) : null,
        }))
        .filter((r) => r.ingredient_id && r.amount);
    }

    // Parse selected modifier groups
    const rawGroups = req.body.group_ids;
    const groupIds = Array.isArray(rawGroups)
      ? rawGroups
      : rawGroups
        ? [rawGroups]
        : [];
    const selectedGroups = groupIds
      .map((g) => parseInt(g, 10))
      .filter((g) => !isNaN(g));
    if (itemIngredients.length) {
      try {
        const [rows] = await db.promise().query("SELECT id FROM units");
        const valid = new Set(rows.map((r) => r.id));
        for (const ing of itemIngredients) {
          if (!valid.has(ing.unit_id)) {
            return res.status(400).send("Invalid unit selection");
          }
        }
      } catch (err) {
        console.error("Error verifying ingredient units:", err);
        return res.status(500).send("DB Error");
      }
    }

    // Parse and validate selected modifiers
    let selectedMods = [];
    const rawMods = req.body.modifier_ids;
    const rawReps = req.body.replaces_ingredient_ids;
    const modIds = Array.isArray(rawMods) ? rawMods : rawMods ? [rawMods] : [];
    const repIds = Array.isArray(rawReps) ? rawReps : rawReps ? [rawReps] : [];
    selectedMods = modIds
      .map((m, idx) => ({
        modifier_id: parseInt(m, 10),
        replaces_ingredient_id: repIds[idx]
          ? parseInt(repIds[idx], 10) || null
          : null,
      }))
      .filter((r) => r.modifier_id);

    if (selectedMods.length) {
      try {
        const [modRows] = await db
          .promise()
          .query("SELECT id, ingredient_id FROM modifiers WHERE id IN (?)", [
            selectedMods.map((r) => r.modifier_id),
          ]);
        if (
          modRows.length !== selectedMods.length ||
          modRows.some((r) => !r.ingredient_id)
        ) {
          return res.redirect("/admin?tab=menu&msg=Invalid+modifier+selection");
        }
      } catch (err) {
        console.error("Error verifying modifiers:", err);
        return res.status(500).send("DB Error");
      }
    }

    if (!name || !stationId || !categoryId) {
      return res.redirect("/admin?tab=menu");
    }
    if (!id && itemIngredients.length === 0) {
      if (recipe === "") {
        return res.redirect(
          "/admin?tab=menu&msg=Ingredients+or+recipe+required",
        );
      }
      return res.redirect("/admin?tab=menu&msg=Ingredients+required");
    }
    if (id) {
      const updateSql = `UPDATE menu_items
                       SET name=?, price=?, station_id=?, category_id=?, image_url=?, recipe=?
                       WHERE id=?`;
      db.query(
        updateSql,
        [name, price, stationId, categoryId, imageUrl, recipe, id],
        (err) => {
          if (err) {
            console.error(err);
          }
          updateItemGroups(db, id, selectedGroups, () => {
            updateItemModifiers(db, id, selectedMods, () => {
              const finish = async () => {
                if (wantsJSON) {
                  try {
                    const [rows] = await db
                      .promise()
                      .query("SELECT name FROM stations WHERE id=?", [
                        stationId,
                      ]);
                    const stationName = rows[0] ? rows[0].name : "";
                    return res.json({
                      item: {
                        id: parseInt(id, 10),
                        name,
                        price,
                        station_id: stationId,
                        station_name: stationName,
                        category_id: categoryId,
                        recipe,
                        image_url: imageUrl,
                        modifierNamesStr: "",
                      },
                    });
                  } catch (err2) {
                    console.error("Error returning item json:", err2);
                    return res.status(500).json({ error: "DB Error" });
                  }
                }
                return res.redirect("/admin?tab=menu&msg=Item+saved");
              };
              if (itemIngredients.length) {
                updateItemIngredients(db, id, itemIngredients, finish);
              } else {
                finish();
              }
            });
          });
        },
      );
    } else {
      const sortSql =
        "SELECT IFNULL(MAX(sort_order), -1) AS maxOrder FROM menu_items WHERE category_id=?";
      db.query(sortSql, [categoryId], (err, results) => {
        if (err) {
          console.error(err);
          results = [{ maxOrder: -1 }];
        }
        const nextOrder = (results[0].maxOrder || 0) + 1;
        const insertSql = `INSERT INTO menu_items (name, price, station_id, category_id, image_url, recipe, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.query(
          insertSql,
          [name, price, stationId, categoryId, imageUrl, recipe, nextOrder],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.redirect("/admin?tab=menu");
            }
            const newItemId = result.insertId;
            updateItemGroups(db, newItemId, selectedGroups, () => {
              updateItemModifiers(db, newItemId, selectedMods, () => {
                updateItemIngredients(
                  db,
                  newItemId,
                  itemIngredients,
                  async () => {
                    if (wantsJSON) {
                      try {
                        const [rows] = await db
                          .promise()
                          .query("SELECT name FROM stations WHERE id=?", [
                            stationId,
                          ]);
                        const stationName = rows[0] ? rows[0].name : "";
                        return res.json({
                          item: {
                            id: newItemId,
                            name,
                            price,
                            station_id: stationId,
                            station_name: stationName,
                            category_id: categoryId,
                            recipe,
                            image_url: imageUrl,
                            modifierNamesStr: "",
                          },
                        });
                      } catch (err2) {
                        console.error("Error returning item json:", err2);
                        return res.status(500).json({ error: "DB Error" });
                      }
                    }
                    return res.redirect("/admin?tab=menu&msg=Item+saved");
                  },
                );
              });
            });
          },
        );
      });
    }
  });

  router.post("/admin/items/delete", (req, res) => {
    const itemId = req.body.id;
    if (!itemId) return res.redirect("/admin?tab=menu");
    db.query(
      "SELECT name FROM menu_items WHERE id=?",
      [itemId],
      (err, rows) => {
        const itemName = !err && rows && rows[0] ? rows[0].name : "Item";
        db.query("DELETE FROM menu_items WHERE id=?", [itemId], (err2) => {
          if (err2) {
            console.error("Error deleting item:", err2);
          }
          return res.redirect(
            `/admin?tab=menu&msg=Item+deleted&detail=${encodeURIComponent(
              itemName + " removed",
            )}`,
          );
        });
      },
    );
  });

  router.post("/admin/categories", (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    if (!name) return res.redirect("/admin?tab=menu");
    if (id) {
      db.query("UPDATE categories SET name=? WHERE id=?", [name, id], (err) => {
        if (err) {
          console.error(err);
        }
        return res.redirect("/admin?tab=menu&msg=Category+saved");
      });
    } else {
      const sortSql =
        "SELECT IFNULL(MAX(sort_order), -1) AS maxOrder FROM categories";
      db.query(sortSql, (err, results) => {
        if (err) {
          console.error(err);
          results = [{ maxOrder: -1 }];
        }
        const nextOrder = (results[0].maxOrder || 0) + 1;
        db.query(
          "INSERT INTO categories (name, sort_order) VALUES (?, ?)",
          [name, nextOrder],
          (err2) => {
            if (err2) {
              console.error(err2);
            }
            return res.redirect("/admin?tab=menu&msg=Category+saved");
          },
        );
      });
    }
  });

  router.post("/admin/categories/delete", (req, res) => {
    const categoryId = req.body.id;
    if (!categoryId) return res.redirect("/admin?tab=menu");
    db.query(
      "SELECT COUNT(*) AS count FROM menu_items WHERE category_id=?",
      [categoryId],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.redirect("/admin?tab=menu");
        }
        if (results[0].count > 0) {
          console.error("Cannot delete category with existing items.");
          return res.redirect("/admin?tab=menu");
        }
        db.query("DELETE FROM categories WHERE id=?", [categoryId], (err2) => {
          if (err2) {
            console.error("Error deleting category:", err2);
          }
          return res.redirect("/admin?tab=menu&msg=Category+deleted");
        });
      },
    );
  });

  router.post("/admin/categories/reorder", (req, res) => {
    const newOrder = req.body.order;
    if (!Array.isArray(newOrder)) return res.sendStatus(400);
    newOrder.forEach((catId, index) => {
      db.query(
        "UPDATE categories SET sort_order=? WHERE id=?",
        [index, catId],
        (err) => {
          if (err) console.error("Error updating category order:", err);
        },
      );
    });
    return res.sendStatus(200);
  });

  router.post("/admin/items/reorder", (req, res) => {
    const categoryId = req.body.categoryId;
    const newOrder = req.body.order;
    if (!categoryId || !Array.isArray(newOrder)) return res.sendStatus(400);
    newOrder.forEach((itemId, index) => {
      db.query(
        "UPDATE menu_items SET sort_order=?, category_id=? WHERE id=?",
        [index, categoryId, itemId],
        (err) => {
          if (err) console.error("Error updating item order:", err);
        },
      );
    });
    return res.sendStatus(200);
  });
  router.post("/admin/ingredients", (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const unitIdRaw = req.body.unit_id;
    const unit = unitIdRaw ? parseInt(unitIdRaw, 10) : null;
    const catRaw = req.body.category_id;
    const categoryId = catRaw ? parseInt(catRaw, 10) : null;
    let tagIds = req.body.tag_ids
      ? Array.isArray(req.body.tag_ids)
        ? req.body.tag_ids
        : [req.body.tag_ids]
      : [];
    tagIds = tagIds.map((t) => parseInt(t, 10)).filter((t) => !isNaN(t));
    const sku = req.body.sku || null;
    let totalCost = parseFloat(req.body.cost);
    if (isNaN(totalCost)) totalCost = 0;
    let qty = parseFloat(req.body.quantity);
    if (isNaN(qty)) qty = 0;
    const cost = qty > 0 ? totalCost / qty : totalCost;
    const isPublic = req.body.is_public ? 1 : 0;
    if (!name) return res.redirect("/admin?tab=inventory");

    const saveTags = (ingId, cb) => {
      db.query(
        "DELETE FROM ingredient_tags WHERE ingredient_id=?",
        [ingId],
        (err) => {
          if (err) console.error(err);
          if (tagIds.length === 0) return cb();
          const values = tagIds.map((tid) => [ingId, tid]);
          db.query(
            "INSERT INTO ingredient_tags (ingredient_id, tag_id) VALUES ?",
            [values],
            (err2) => {
              if (err2) console.error(err2);
              cb();
            },
          );
        },
      );
    };
    if (id) {
      db.query(
        "UPDATE ingredients SET name=?, quantity=?, unit_id=?, category_id=?, sku=?, cost=?, is_public=? WHERE id=?",
        [name, qty, unit, categoryId, sku, cost, isPublic, id],
        (err) => {
          if (err) console.error("Error updating ingredient:", err);
          saveTags(id, () => {
            res.redirect("/admin?tab=inventory&msg=Ingredient+saved");
          });
        },
      );
    } else {
      db.query(
        "INSERT INTO ingredients (name, quantity, unit_id, category_id, sku, cost, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, qty, unit, categoryId, sku, cost, isPublic],
        (err, result) => {
          if (err) {
            console.error("Error inserting ingredient:", err);
            return res.redirect("/admin?tab=inventory");
          }
          saveTags(result.insertId, () => {
            res.redirect("/admin?tab=inventory&msg=Ingredient+saved");
          });
        },
      );
    }
  });

  router.post("/admin/ingredients/delete", (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect("/admin?tab=inventory");
    db.query("DELETE FROM ingredients WHERE id=?", [id], (err) => {
      if (err) {
        console.error("Error deleting ingredient:", err);
        return res.redirect(
          "/admin?tab=inventory&error=Unable+to+delete+ingredient",
        );
      }
      res.redirect("/admin?tab=inventory&msg=Ingredient+deleted");
    });
  });

  router.get("/admin/ingredients/list", async (req, res) => {
    try {
      const [ingredients] = await db.promise().query(
        `SELECT ing.id, ing.name, ing.quantity, ing.unit_id,
                  u.abbreviation AS unit, ing.sku, ing.cost, ing.is_public
             FROM ingredients ing
             LEFT JOIN units u ON ing.unit_id = u.id
            WHERE ing.is_public=1
             ORDER BY ing.name`,
      );
      res.json({ ingredients });
    } catch (err) {
      console.error("Error fetching ingredient list:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  router.post("/admin/item-categories", (req, res) => {
    const { id, name, parent_id } = req.body;
    if (!name) return res.redirect("/admin?tab=inventory");
    if (id) {
      db.query(
        "UPDATE item_categories SET name=?, parent_id=? WHERE id=?",
        [name, parent_id || null, id],
        (err) => {
          if (err) console.error("Error updating item category:", err);
          res.redirect("/admin?tab=inventory&msg=Category+saved");
        },
      );
    } else {
      db.query(
        "INSERT INTO item_categories (name, parent_id) VALUES (?, ?)",
        [name, parent_id || null],
        (err) => {
          if (err) console.error("Error inserting item category:", err);
          res.redirect("/admin?tab=inventory&msg=Category+saved");
        },
      );
    }
  });

  router.post("/admin/item-categories/delete", (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin?tab=inventory");
    db.query("DELETE FROM item_categories WHERE id=?", [id], (err) => {
      if (err) console.error("Error deleting item category:", err);
      res.redirect("/admin?tab=inventory&msg=Category+deleted");
    });
  });

  router.post("/admin/tags", (req, res) => {
    const { id, name } = req.body;
    if (!name) return res.redirect("/admin?tab=inventory");
    if (id) {
      db.query("UPDATE tags SET name=? WHERE id=?", [name, id], (err) => {
        if (err) console.error("Error updating tag:", err);
        res.redirect("/admin?tab=inventory&msg=Tag+saved");
      });
    } else {
      db.query("INSERT INTO tags (name) VALUES (?)", [name], (err) => {
        if (err) console.error("Error inserting tag:", err);
        res.redirect("/admin?tab=inventory&msg=Tag+saved");
      });
    }
  });

  router.post("/admin/tags/delete", (req, res) => {
    const { id } = req.body;
    if (!id) return res.redirect("/admin?tab=inventory");
    db.query("DELETE FROM tags WHERE id=?", [id], (err) => {
      if (err) console.error("Error deleting tag:", err);
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
      console.error("Error recording transaction:", err);
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
      console.error("Error fetching inventory stats:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  router.get("/admin/reports/data", async (req, res) => {
    try {
      const { start, end } = req.query;
      const sales = await fetchSalesTotals(db, start, end);
      const usage = await fetchIngredientUsage(db, start, end);
      const topItems = await fetchTopMenuItems(db, start, end);
      const categorySales = await fetchCategorySales(db, start, end);
      const lowStock = await fetchLowStockIngredients(db);
      const avgTimes = await fetchAverageBumpTimes(db, start, end);
      res.json({ sales, usage, topItems, categorySales, lowStock, avgTimes });
    } catch (err) {
      console.error("Error fetching reports data:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  router.get("/admin/inventory/logs", async (req, res) => {
    try {
      const { start, end } = req.query;
      const endDate = end ? new Date(end) : new Date();
      const startDate = start
        ? new Date(start)
        : new Date(endDate.getTime() - 86400000);
      function fmt(d) {
        return d.toISOString().slice(0, 19).replace("T", " ");
      }
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
      console.error("Error fetching inventory logs:", err);
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
      console.error("Error creating usage log:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/modifiers", (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    let price = parseFloat(req.body.price);
    const groupId = req.body.group_id || null;
    const ingredientId = parseInt(req.body.ingredient_id, 10);
    if (isNaN(price)) price = 0.0;
    if (!name || !ingredientId)
      return res.redirect("/admin?tab=menu&openMods=1");

    db.query(
      "SELECT id, name FROM ingredients WHERE id=? LIMIT 1",
      [ingredientId],
      (err, rows) => {
        if (err || rows.length === 0) {
          console.error("Invalid ingredient for modifier");
          return res.redirect("/admin?tab=menu&openMods=1");
        }
        const ingName = rows[0].name;
        const modName = name.trim() || ingName;
        const params = [modName, price, groupId, ingredientId];
        if (id) {
          db.query(
            "UPDATE modifiers SET name=?, price=?, group_id=?, ingredient_id=? WHERE id=?",
            [...params, id],
            (err2) => {
              if (err2) {
                console.error(err2);
              }
              return res.redirect(
                "/admin?tab=menu&msg=Modifier+saved&openMods=1",
              );
            },
          );
        } else {
          db.query(
            "INSERT INTO modifiers (name, price, group_id, ingredient_id) VALUES (?, ?, ?, ?)",
            params,
            (err2) => {
              if (err2) {
                console.error(err2);
              }
              return res.redirect(
                "/admin?tab=menu&msg=Modifier+saved&openMods=1",
              );
            },
          );
        }
      },
    );
  });

  router.post("/admin/modifiers/delete", (req, res) => {
    const modId = req.body.id;
    if (!modId) return res.redirect("/admin?tab=menu&openMods=1");
    db.query("DELETE FROM modifiers WHERE id=?", [modId], (err) => {
      if (err) {
        console.error("Error deleting modifier:", err);
      }
      return res.redirect("/admin?tab=menu&msg=Modifier+deleted&openMods=1");
    });
  });

  router.post("/admin/modifier-groups", (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    if (!name) return res.redirect("/admin?tab=menu");
    if (id) {
      db.query(
        "UPDATE modifier_groups SET name=? WHERE id=?",
        [name, id],
        (err) => {
          if (err) {
            console.error(err);
          }
          res.redirect("/admin?tab=menu&msg=Group+saved");
        },
      );
    } else {
      db.query(
        "INSERT INTO modifier_groups (name) VALUES (?)",
        [name],
        (err) => {
          if (err) {
            console.error(err);
          }
          res.redirect("/admin?tab=menu&msg=Group+saved");
        },
      );
    }
  });

  router.post("/admin/modifier-groups/delete", (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect("/admin?tab=menu");
    db.query("DELETE FROM modifier_groups WHERE id=?", [id], (err) => {
      if (err) {
        console.error("Error deleting modifier group:", err);
      }
      res.redirect("/admin?tab=menu&msg=Group+deleted");
    });
  });

  router.get("/admin/stations", (req, res) => {
    res.redirect("/admin?tab=stations");
  });

  router.post("/admin/stations", (req, res) => {
    const wantsJSON =
      req.headers.accept && req.headers.accept.includes("application/json");
    const name = req.body.name;
    const type = req.body.type;
    let filter = req.body.order_type_filter;
    const bg = req.body.bg_color || null;
    const primary = req.body.primary_color || null;
    const font = req.body.font_family || null;
    if (filter === "") filter = null;
    const insert = () => {
      db.query(
        "INSERT INTO stations (name, type, order_type_filter, bg_color, primary_color, font_family) VALUES (?, ?, ?, ?, ?, ?)",
        [name, type, filter, bg, primary, font],
        async (err, result) => {
          if (err) {
            console.error("Error inserting station:", err);
            if (wantsJSON) return res.status(500).json({ error: "DB Error" });
          }
          if (wantsJSON) {
            return res.json({
              station: {
                id: result.insertId,
                name,
                type,
                order_type_filter: filter,
                bg_color: bg,
                primary_color: primary,
                font_family: font,
              },
            });
          }
          res.redirect("/admin?tab=stations&msg=Station+saved");
        },
      );
    };

    insert();
  });

  router.post("/admin/stations/update", (req, res) => {
    const wantsJSON =
      req.headers.accept && req.headers.accept.includes("application/json");
    const id = req.body.id;
    const name = req.body.name;
    const type = req.body.type;
    let filter = req.body.order_type_filter;
    const bg = req.body.bg_color || null;
    const primary = req.body.primary_color || null;
    const font = req.body.font_family || null;
    if (!id) return res.redirect("/admin?tab=stations");
    if (filter === "") filter = null;

    const update = () => {
      db.query(
        "UPDATE stations SET name=?, type=?, order_type_filter=?, bg_color=?, primary_color=?, font_family=? WHERE id=?",
        [name, type, filter, bg, primary, font, id],
        (err) => {
          if (err) {
            console.error("Error updating station:", err);
            if (wantsJSON) return res.status(500).json({ error: "DB Error" });
          }
          if (wantsJSON) {
            return res.json({
              station: {
                id: parseInt(id, 10),
                name,
                type,
                order_type_filter: filter,
                bg_color: bg,
                primary_color: primary,
                font_family: font,
              },
            });
          }
          res.redirect("/admin?tab=stations&msg=Station+saved");
        },
      );
    };

    update();
  });

  router.post("/admin/stations/delete", (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect("/admin?tab=stations");
    db.query("DELETE FROM stations WHERE id=?", [id], (err) => {
      if (err) console.error("Error deleting station:", err);
      res.redirect("/admin?tab=stations&msg=Station+deleted");
    });
  });
  router.get("/admin/inventory", (req, res) => {
    res.redirect("/admin?tab=inventory");
  });
  router.get("/admin/theme", (req, res) => {
    res.redirect("/admin?tab=theme");
  });

  router.post("/admin/settings", (req, res) => {
    const { settings, errors } = validateSettings(req.body);
    if (errors.length) {
      return res.redirect("/admin?tab=theme&err=Invalid+settings");
    }
    const keys = Object.keys(settings);
    if (keys.length === 0) return res.redirect("/admin?tab=theme");

    let remaining = keys.length;
    keys.forEach((key) => {
      const value = settings[key];
      const sql =
        "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)";
      db.query(sql, [key, value], (err) => {
        if (err) console.error("Error saving setting:", err);
        if (--remaining === 0) {
          settingsCache.loadSettings(db);
          res.redirect("/admin?tab=theme&msg=Settings+saved");
        }
      });
    });
  });

  // Purchase orders
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
      console.error("Error receiving order:", err);
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
      console.error("Error adding order item:", err);
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
      console.error("Error deleting order item:", err);
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
        if (err) console.error("Error inserting purchase order:", err);
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
      console.error("Error fetching order detail:", err);
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
      console.error("Error saving supplier:", err);
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
      console.error("Error receiving order:", err);
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
      console.error("Error deleting supplier:", err);
      res.status(500).send("DB Error");
    }
  });

  router.post("/admin/purchase-orders/delete", (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect("/admin/purchase-orders");
    db.query("DELETE FROM purchase_orders WHERE id=?", [id], (err) => {
      if (err) console.error("Error deleting order:", err);
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
        if (err) console.error("Error inserting PO item:", err);
        res.redirect(`/admin/purchase-orders/${orderId}`);
      },
    );
  });

  router.post("/admin/purchase-order-items/delete", (req, res) => {
    const id = req.body.id;
    const orderId = req.body.order_id;
    if (!id) return res.redirect("/admin/purchase-orders");
    db.query("DELETE FROM purchase_order_items WHERE id=?", [id], (err) => {
      if (err) console.error("Error deleting PO item:", err);
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
      console.error("Error saving location:", err);
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
      console.error("Error deleting location:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/admin/backups", (req, res) => {
    res.redirect("/admin?tab=backup");
  });

  router.get("/admin/updates", (req, res) => {
    res.redirect("/admin?tab=updates");
  });

  router.get("/admin/updates/info", (req, res) => {
    try {
      const commit = execSync("git rev-parse --short HEAD").toString().trim();
      const date = execSync("git log -1 --format=%cd").toString().trim();
      const log = execSync(
        "git log -5 --format=%h %s --date=short"
      )
        .toString()
        .trim()
        .split("\n");
      res.json({ commit, date, log });
    } catch (err) {
      console.error("Error reading git info:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/admin/backups/create", (req, res) => {
    backupDatabase(db, (err) => {
      if (err) {
        if (err.message === "Backup already running") {
          return res.redirect("/admin/backups?msg=Backup+queued");
        }
        console.error("Backup error:", err);
        return res.status(500).send("DB Error");
      }
      res.redirect("/admin/backups?msg=Backup+created");
    });
  });

  router.get("/admin/backups/list", (req, res) => {
    listBackups((err, files) => {
      if (err) {
        console.error("Error listing backups:", err);
        return res.status(500).json({ error: "Failed" });
      }
      res.json({ backups: files });
    });
  });

  router.get("/admin/backups/log", async (req, res) => {
    try {
      const [log] = await db
        .promise()
        .query(
          "SELECT action, result, message, created_at FROM backup_log ORDER BY id DESC LIMIT 50",
        );
      res.json({ log });
    } catch (err) {
      console.error("Error fetching backup log:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/admin/backups/restore", (req, res) => {
    const file = req.body.file;
    if (!file) return res.redirect("/admin?tab=backup");
    const full = path.join(getBackupDir(), path.basename(file));
    restoreDatabase(db, full, (err) => {
      if (err) {
        console.error("Restore error:", err);
        return res.status(500).send("DB Error");
      }
      res.redirect("/admin/backups?msg=Restore+complete");
    });
  });

  router.post("/admin/backups/upload", upload.single("backup"), (req, res) => {
    if (!req.file) return res.redirect("/admin?tab=backup");
    const cleanup = () => fs.unlink(req.file.path, () => {});
    const isSql =
      req.file.originalname &&
      req.file.originalname.toLowerCase().endsWith(".sql");
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (!isSql || req.file.size > maxSize) {
      cleanup();
      return res.status(400).send("Invalid backup file");
    }
    restoreDatabase(db, req.file.path, (err) => {
      cleanup();
      if (err) {
        console.error("Restore error:", err);
        return res.status(500).send("DB Error");
      }
      res.redirect("/admin/backups?msg=Restore+complete");
    });
  });

  router.get("/admin/backups/download", (req, res) => {
    const file = req.query.file;
    if (!file) return res.status(400).send("No file");
    const full = path.join(getBackupDir(), path.basename(file));
    res.download(full, file, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) res.status(500).send("Server Error");
      }
    });
  });

  router.post("/admin/backups/delete", (req, res) => {
    const file = req.body.file;
    if (!file) return res.redirect("/admin?tab=backup");
    deleteBackup(db, file, (err) => {
      if (err) {
        if (err.message === "Invalid path") {
          return res.status(400).send("Invalid path");
        }
        console.error("Delete error:", err);
        return res.status(500).send("Server Error");
      }
      res.redirect("/admin/backups?msg=Backup+deleted");
    });
  });

  router.get("/admin/backups/browse", (req, res) => {
    const root = path.resolve(getBackupDir());
    const requested = req.query.dir || ".";
    const dir = path.resolve(root, requested);

    if (dir !== root && !dir.startsWith(root + path.sep)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    fs.readdir(dir, { withFileTypes: true }, (err, items) => {
      if (err) {
        console.error("Error reading dir:", err);
        return res.status(500).json({ error: "Failed" });
      }
      const dirs = items.filter((i) => i.isDirectory()).map((i) => i.name);
      res.json({ dir, parent: path.dirname(dir), dirs });
    });
  });

  router.post("/admin/backups/set-dir", async (req, res) => {
    const dir = (req.body.dir || "").trim();
    if (!dir) return res.redirect("/admin?tab=backup");
    try {
      await db
        .promise()
        .query(
          "INSERT INTO settings (setting_key, setting_value) VALUES ('backup_dir', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [dir],
        );
      setBackupDir(dir);
      settingsCache.loadSettings(db);
      res.redirect("/admin/backups?msg=Location+saved");
    } catch (err) {
      console.error("Error saving backup dir:", err);
      res.status(500).send("DB Error");
    }
  });

  return router;
};
