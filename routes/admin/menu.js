const express = require("express");
const logger = require("../../utils/logger");
const {
  updateItemModifiers,
  updateItemGroups,
  updateItemIngredients,
} = require("../../controllers/db/menu");

module.exports = (db) => {
  const router = express.Router();

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
    const isAvailable =
      req.body.is_available !== undefined
        ? parseInt(req.body.is_available, 10)
          ? 1
          : 0
        : 1;
    const stock =
      req.body.stock !== undefined && req.body.stock !== ""
        ? parseInt(req.body.stock, 10)
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
        logger.error("Error verifying ingredient units:", err);
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
        logger.error("Error verifying modifiers:", err);
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
                       SET name=?, price=?, station_id=?, category_id=?, image_url=?, recipe=?, is_available=?, stock=?
                       WHERE id=?`;
      db.query(
        updateSql,
        [
          name,
          price,
          stationId,
          categoryId,
          imageUrl,
          recipe,
          isAvailable,
          stock,
          id,
        ],
        (err) => {
          if (err) logger.error("Error updating item:", err);
          updateItemIngredients(db, id, itemIngredients, (err2) => {
            if (err2) {
              logger.error("Error updating ingredients:", err2);
            }
            updateItemGroups(db, id, selectedGroups, (err3) => {
              if (err3) {
                logger.error("Error updating groups:", err3);
              }
              updateItemModifiers(db, id, selectedMods, (err4) => {
                if (err4) {
                  logger.error("Error updating modifiers:", err4);
                }
                return res.redirect("/admin?tab=menu&msg=Item+saved");
              });
            });
          });
        },
      );
    } else {
      const insertSql =
        "INSERT INTO menu_items (name, price, station_id, category_id, image_url, recipe, is_available, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      db.query(
        insertSql,
        [
          name,
          price,
          stationId,
          categoryId,
          imageUrl,
          recipe,
          isAvailable,
          stock,
        ],
        (err, result) => {
          if (err) {
            logger.error("Error inserting item:", err);
            return res.redirect("/admin?tab=menu");
          }
          const itemId = result.insertId;
          updateItemIngredients(db, itemId, itemIngredients, (err2) => {
            if (err2) {
              logger.error("Error saving ingredients:", err2);
            }
            updateItemGroups(db, itemId, selectedGroups, (err3) => {
              if (err3) {
                logger.error("Error saving groups:", err3);
              }
              updateItemModifiers(db, itemId, selectedMods, (err4) => {
                if (err4) {
                  logger.error("Error saving modifiers:", err4);
                }
                return res.redirect("/admin?tab=menu&msg=Item+saved");
              });
            });
          });
        },
      );
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
            logger.error("Error deleting item:", err2);
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
          logger.error(err);
        }
        return res.redirect("/admin?tab=menu&msg=Category+saved");
      });
    } else {
      const sortSql =
        "SELECT IFNULL(MAX(sort_order), -1) AS maxOrder FROM categories";
      db.query(sortSql, (err, results) => {
        if (err) {
          logger.error(err);
          results = [{ maxOrder: -1 }];
        }
        const nextOrder = (results[0].maxOrder || 0) + 1;
        db.query(
          "INSERT INTO categories (name, sort_order) VALUES (?, ?)",
          [name, nextOrder],
          (err2) => {
            if (err2) {
              logger.error(err2);
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
          logger.error(err);
          return res.redirect("/admin?tab=menu");
        }
        if (results[0].count > 0) {
          logger.error("Cannot delete category with existing items.");
          return res.redirect("/admin?tab=menu");
        }
        db.query("DELETE FROM categories WHERE id=?", [categoryId], (err2) => {
          if (err2) {
            logger.error("Error deleting category:", err2);
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
          if (err) logger.error("Error updating category order:", err);
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
          if (err) logger.error("Error updating item order:", err);
        },
      );
    });
    return res.sendStatus(200);
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
          logger.error("Invalid ingredient for modifier");
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
                logger.error(err2);
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
                logger.error(err2);
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
        logger.error("Error deleting modifier:", err);
      }
      return res.redirect(
        "/admin?tab=menu&msg=Modifier+deleted&openMods=1",
      );
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
            logger.error(err);
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
            logger.error(err);
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
        logger.error("Error deleting modifier group:", err);
      }
      res.redirect("/admin?tab=menu&msg=Group+deleted");
    });
  });

  return router;
};

