const logger = require('../utils/logger');
const express = require("express");
const { getBumpedOrders } = require("../controllers/db/orders");
const { getStations, getCategories } = require("../controllers/db/menu");
const { roleHasAccess } = require("../controllers/accessControl");
module.exports = (db) => {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.session.user) return next();
    const role = req.session.user.role;
    let comp = null;
    if (req.path.startsWith("/order")) comp = "order";
    else if (
      req.path.startsWith("/stations") ||
      req.path.startsWith("/station") ||
      req.path.startsWith("/wiki")
    ) {
      comp = "stations";
    }
    if (comp && !roleHasAccess(role, comp)) {
      return res.status(403).send("Forbidden");
    }
    next();
  });

  router.get("/stations", async (req, res) => {
    try {
      const rows = await getStations(db);
      res.render("stations", { stations: rows });
    } catch (err) {
      logger.error("Error fetching stations:", err);
      res.status(500).send("DB Error");
    }
  });

  router.get("/station/:id", (req, res) => {
    const stationId = parseInt(req.params.id, 10);
    if (isNaN(stationId)) return res.redirect("/stations");

    db.query(
      "SELECT * FROM stations WHERE id=?",
      [stationId],
      (err, stRows) => {
        if (err || stRows.length === 0) {
          logger.error("Error fetching station:", err);
          return res.status(404).send("Station not found");
        }
        const station = stRows[0];
        const settings = res.locals.settings || {};
        const conditions = ["o.status = 'active'"];
        const orderParams = [];
        if (station.type !== "expo") {
          conditions.unshift("mi.station_id = ?");
          orderParams.push(stationId);
          conditions.push(
            "NOT EXISTS (SELECT 1 FROM bumped_orders bo WHERE bo.order_id = o.id AND bo.station_id = ?)",
          );
          orderParams.push(stationId);
        }
        if (station.order_type_filter) {
          conditions.push("o.order_type = ?");
          orderParams.push(station.order_type_filter);
        }
        const orderSql = `SELECT o.id AS order_id, o.order_number, o.order_type,
                            o.special_instructions, o.allergy,
                            UNIX_TIMESTAMP(o.created_at) AS ts,
                            oi.id AS order_item_id, oi.quantity,
                            oi.special_instructions AS item_instructions, oi.allergy AS item_allergy,
                            mi.name, mi.station_id, mi.id AS item_id,
                            GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                     FROM orders o
                     JOIN order_items oi ON o.id = oi.order_id
                     JOIN menu_items mi ON oi.menu_item_id = mi.id
                     LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                     LEFT JOIN modifiers m ON oim.modifier_id = m.id
                     WHERE ${conditions.join(" AND ")}
                     GROUP BY oi.id
                     ORDER BY o.id, oi.id`;
        db.query(orderSql, orderParams, (err3, rows) => {
          if (err3) {
            logger.error("Error fetching orders:", err3);
            return res.status(500).send("DB Error");
          }
          const ordersMap = {};
          rows.forEach((row) => {
            if (!ordersMap[row.order_id]) {
              ordersMap[row.order_id] = {
                order_id: row.order_id,
                order_number: row.order_number,
                order_type: row.order_type,
                special_instructions: row.special_instructions || "",
                allergy: !!row.allergy,
                ts: row.ts,
                items: [],
              };
            }
            ordersMap[row.order_id].items.push({
              quantity: row.quantity,
              name: row.name,
              stationId: row.station_id,
              itemId: row.item_id,
              modifiers: row.modifiers ? row.modifiers.split(", ") : [],
              specialInstructions: row.item_instructions || "",
              allergy: !!row.item_allergy,
            });
          });
          const orders = Object.values(ordersMap);
          getBumpedOrders(db, stationId, (errB, bumpedOrders) => {
            if (errB) logger.error("Error fetching bumped orders:", errB);
            getStations(db)
              .then((stationRows) => {
                res.render("station", {
                  station,
                  orders,
                  settings,
                  allStations: stationRows,
                  bumpedOrders,
                });
              })
              .catch((err4) => {
                logger.error("Error fetching stations list:", err4);
                res.status(500).send("DB Error");
              });
          });
        });
      },
    );
  });

  router.get("/wiki/:id", (req, res) => {
    const stationId = parseInt(req.params.id, 10);
    if (isNaN(stationId)) return res.redirect("/stations");

    db.query(
      "SELECT * FROM stations WHERE id=?",
      [stationId],
      (err, stRows) => {
        if (err || stRows.length === 0) {
          logger.error("Error fetching station:", err);
          return res.status(404).send("Station not found");
        }
        const station = stRows[0];
        const settings = res.locals.settings || {};

        db.query(
          "SELECT name, recipe FROM menu_items WHERE station_id=? ORDER BY name",
          [stationId],
          (err3, itemRows) => {
            if (err3) {
              logger.error("Error fetching recipes:", err3);
              return res.status(500).send("DB Error");
            }
            res.render("wiki", { station, items: itemRows, settings });
          },
        );
      },
    );
  });

  router.get("/order", (req, res) => {
    const table = req.query.table || "";
    const sqlItems =
      "SELECT id, name, price, image_url, category_id, is_available, stock FROM menu_items ORDER BY category_id, sort_order, id";
    const sqlItemMods = "SELECT * FROM item_modifiers";
    const sqlItemGroups = "SELECT * FROM item_modifier_groups";
    const sqlMods = "SELECT id, name, group_id FROM modifiers";
    const sqlGroups = "SELECT id, name FROM modifier_groups";
    getCategories(db)
      .then((cats) => {
        db.query(sqlItems, (err2, items) => {
          if (err2) {
            logger.error(err2);
            return res.status(500).send("DB Error");
          }
          db.query(sqlItemMods, (err3, itemMods) => {
            if (err3) {
              logger.error(err3);
              return res.status(500).send("DB Error");
            }
            db.query(sqlItemGroups, (errG, itemGroups) => {
              if (errG) {
                logger.error(errG);
                return res.status(500).send("DB Error");
              }
              db.query(sqlMods, (err4, mods) => {
                if (err4) {
                  logger.error(err4);
                  return res.status(500).send("DB Error");
                }
                db.query(sqlGroups, (err5, groups) => {
                  if (err5) {
                    logger.error(err5);
                    return res.status(500).send("DB Error");
                  }
                  const modMap = {};
                  mods.forEach((m) => {
                    modMap[m.id] = {
                      id: m.id,
                      name: m.name,
                      group_id: m.group_id,
                    };
                  });
                  const itemGroupsMap = {};
                  itemGroups.forEach((g) => {
                    if (!itemGroupsMap[g.menu_item_id])
                      itemGroupsMap[g.menu_item_id] = [];
                    itemGroupsMap[g.menu_item_id].push(g.group_id);
                  });
                  const itemModsMap = {};
                  itemMods.forEach((im) => {
                    const grp = modMap[im.modifier_id]
                      ? modMap[im.modifier_id].group_id
                      : null;
                    const allowed = itemGroupsMap[im.menu_item_id] || [];
                    if (grp && !allowed.includes(grp)) return;
                    if (!itemModsMap[im.menu_item_id])
                      itemModsMap[im.menu_item_id] = [];
                    if (modMap[im.modifier_id])
                      itemModsMap[im.menu_item_id].push(modMap[im.modifier_id]);
                  });
                  const catMap = cats.map((c) => ({
                    id: c.id,
                    name: c.name,
                    items: [],
                  }));
                  const idx = {};
                  catMap.forEach((c) => {
                    idx[c.id] = c;
                  });
                  items.forEach((it) => {
                    if (
                      idx[it.category_id] &&
                      it.is_available &&
                      (it.stock === null || it.stock > 0)
                    ) {
                      idx[it.category_id].items.push({
                        id: it.id,
                        name: it.name,
                        price: it.price,
                        image_url: it.image_url,
                        modifiers: itemModsMap[it.id] || [],
                        stock: it.stock,
                        is_available: it.is_available,
                      });
                    }
                  });
                  res.render("order", {
                    categories: catMap,
                    table,
                    settings: res.locals.settings,
                    modGroups: groups,
                  });
                });
              });
            });
          });
        });
      })
      .catch((err) => {
        logger.error("Error fetching categories:", err);
        res.status(500).send("DB Error");
      });
  });
  return router;
};
