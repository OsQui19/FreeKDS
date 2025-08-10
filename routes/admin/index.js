 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a//dev/null b/routes/admin/index.js
index 0000000000000000000000000000000000000000..1d52fc59b7d9670e7b06f8acf3cf337723ec18f0 100644
--- a//dev/null
+++ b/routes/admin/index.js
@@ -0,0 +1,507 @@
+const express = require("express");
+const logger = require("../../utils/logger");
+const {
+  getMenuData,
+  getStations,
+  getIngredients,
+  getUnits,
+  getItemCategories,
+  getTags,
+  getSuppliers,
+  getLocations,
+  getPurchaseOrders,
+  getCategories,
+} = require("../../controllers/dbHelpers");
+const {
+  fetchSalesTotals,
+  fetchIngredientUsage,
+  fetchTopMenuItems,
+  fetchCategorySales,
+  fetchLowStockIngredients,
+  fetchAverageBumpTimes,
+} = require("../../controllers/analytics");
+const settingsCache = require("../../controllers/settingsCache");
+const { logSecurityEvent } = require("../../controllers/securityLog");
+const { validateSettings } = require("../../utils/validateSettings");
+const { execSync } = require("child_process");
+const config = require("../../config");
+const RELEASE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
+let releaseCache = null;
+let releaseCacheTime = 0;
+
+const menuRoutes = require("./menu");
+const inventoryRoutes = require("./inventory");
+const backupRoutes = require("./backups");
+
+module.exports = (db, io) => {
+  const router = express.Router();
+  const {
+    hasLevel,
+    getHierarchy,
+    roleHasAccess,
+    getRolePermissions,
+    ALL_MODULES,
+  } = require("../../controllers/accessControl");
+
+  router.use((req, res, next) => {
+    if (!req.path.startsWith("/admin")) return next();
+    if (req.session.pinOnly) {
+      logSecurityEvent(
+        db,
+        "unauthorized",
+        req.session.user && req.session.user.id,
+        req.originalUrl,
+        false,
+        req.ip,
+      );
+      return res.status(403).send("Forbidden");
+    }
+    if (!req.session.user) return next();
+    const role = req.session.user.role;
+    const topRole = getHierarchy().slice(-1)[0];
+    const map = {
+      "/admin/stations": "stations",
+      "/admin/menu": "menu",
+      "/admin/theme": "theme",
+      "/admin/inventory": "inventory",
+      "/admin/suppliers": "inventory",
+      "/admin/purchase-orders": "inventory",
+      "/admin/reports": "reports",
+      "/admin/locations": "locations",
+      "/admin/backups": "backup",
+      "/admin/updates": "updates",
+    };
+    const comp = Object.entries(map).find(([p]) => req.path.startsWith(p));
+    if (comp) {
+      const c = comp[1];
+      if (!roleHasAccess(role, c)) {
+        logSecurityEvent(
+          db,
+          "unauthorized",
+          req.session.user.id,
+          req.originalUrl,
+          false,
+          req.ip,
+        );
+        return res.status(403).send("Forbidden");
+      }
+    } else if (req.path === "/admin" || req.path === "/admin/") {
+      const allowed = getRolePermissions(role);
+      if (!allowed.length && !hasLevel(role, topRole)) {
+        logSecurityEvent(
+          db,
+          "unauthorized",
+          req.session.user.id,
+          req.originalUrl,
+          false,
+          req.ip,
+        );
+        return res.status(403).send("Forbidden");
+      }
+    } else if (!hasLevel(role, topRole)) {
+      logSecurityEvent(
+        db,
+        "unauthorized",
+        req.session.user.id,
+        req.originalUrl,
+        false,
+        req.ip,
+      );
+      return res.status(403).send("Forbidden");
+    }
+    next();
+  });
+
+  router.use(menuRoutes(db));
+  router.use(inventoryRoutes(db, io));
+  router.use(backupRoutes(db));
+
+  router.get("/admin", async (req, res) => {
+    try {
+      const {
+        categories,
+        stations: menuStations,
+        mods,
+        modGroups,
+        ingredients: publicIngredients,
+        units,
+      } = await getMenuData(db);
+      const stationRows = await getStations(db);
+      const allIngredients = await getIngredients(db);
+      const itemCategories = await getItemCategories(db);
+      const tags = await getTags(db);
+      const unitRows = await getUnits(db);
+      const [logRows] = await db
+        .promise()
+        .query(`SELECT l.*, mi.name AS item_name, ing.name AS ingredient_name, u.abbreviation AS unit
+                                                FROM inventory_log l
+                                                JOIN menu_items mi ON l.menu_item_id = mi.id
+                                                JOIN ingredients ing ON l.ingredient_id = ing.id
+                                                LEFT JOIN units u ON ing.unit_id = u.id
+                                                ORDER BY l.id DESC LIMIT 100`);
+      const [transactions] = await db
+        .promise()
+        .query(`SELECT t.*, ing.name AS ingredient_name, u.abbreviation AS unit
+                                                      FROM inventory_transactions t
+                                                      JOIN ingredients ing ON t.ingredient_id = ing.id
+                                                      LEFT JOIN units u ON ing.unit_id = u.id
+                                                      ORDER BY t.id DESC LIMIT 100`);
+      const summarySql = `SELECT ing.id AS ingredient_id, ing.name, u.abbreviation AS unit, SUM(d.amount) AS total
+                          FROM daily_usage_log d
+                          JOIN ingredients ing ON d.ingredient_id = ing.id
+                          LEFT JOIN units u ON ing.unit_id = u.id
+                          GROUP BY ing.id
+                          ORDER BY ing.name`;
+      const [summary] = await db.promise().query(summarySql);
+
+      const suppliers = await getSuppliers(db);
+      const locations = await getLocations(db);
+      const orders = await getPurchaseOrders(db);
+
+      const settings = res.locals.settings || {};
+      const allowedModules = getRolePermissions(req.session.user.role);
+      res.render("admin/home", {
+        stations: stationRows,
+        categories,
+        stationsMenu: menuStations,
+        mods,
+        modGroups,
+        ingredients: allIngredients,
+        itemCategories,
+        tags,
+        publicIngredients,
+        logs: logRows,
+        summary,
+        transactions,
+        units: unitRows,
+        suppliers,
+        locations,
+        orders,
+        settings,
+        allowedModules,
+        modules: ALL_MODULES,
+      });
+    } catch (err) {
+      logger.error("Error fetching admin page data:", err);
+      res.status(500).send("DB Error");
+    }
+  });
+
+  router.get("/admin/reports/data", async (req, res) => {
+    try {
+      const { start, end } = req.query;
+      const sales = await fetchSalesTotals(db, start, end);
+      const usage = await fetchIngredientUsage(db, start, end);
+      const topItems = await fetchTopMenuItems(db, start, end);
+      const categorySales = await fetchCategorySales(db, start, end);
+      const lowStock = await fetchLowStockIngredients(db);
+      const avgTimes = await fetchAverageBumpTimes(db, start, end);
+      res.json({ sales, usage, topItems, categorySales, lowStock, avgTimes });
+    } catch (err) {
+      logger.error("Error fetching reports data:", err);
+      res.status(500).json({ error: "DB Error" });
+    }
+  });
+
+  router.get("/admin/stations", (req, res) => {
+    res.redirect("/admin?tab=stations");
+  });
+
+  router.post("/admin/stations", (req, res) => {
+    const wantsJSON =
+      req.headers.accept && req.headers.accept.includes("application/json");
+    const name = req.body.name;
+    const type = req.body.type;
+    let filter = req.body.order_type_filter;
+    const bg = req.body.bg_color || null;
+    const primary = req.body.primary_color || null;
+    const font = req.body.font_family || null;
+    if (filter === "") filter = null;
+    const insert = () => {
+      db.query(
+        "INSERT INTO stations (name, type, order_type_filter, bg_color, primary_color, font_family) VALUES (?, ?, ?, ?, ?, ?)",
+        [name, type, filter, bg, primary, font],
+        async (err, result) => {
+          if (err) {
+            logger.error("Error inserting station:", err);
+            if (wantsJSON) return res.status(500).json({ error: "DB Error" });
+          }
+          if (wantsJSON) {
+            return res.json({
+              station: {
+                id: result.insertId,
+                name,
+                type,
+                order_type_filter: filter,
+                bg_color: bg,
+                primary_color: primary,
+                font_family: font,
+              },
+            });
+          }
+          res.redirect("/admin?tab=stations&msg=Station+saved");
+        },
+      );
+    };
+
+    insert();
+  });
+
+  router.post("/admin/stations/update", (req, res) => {
+    const wantsJSON =
+      req.headers.accept && req.headers.accept.includes("application/json");
+    const id = req.body.id;
+    const name = req.body.name;
+    const type = req.body.type;
+    let filter = req.body.order_type_filter;
+    const bg = req.body.bg_color || null;
+    const primary = req.body.primary_color || null;
+    const font = req.body.font_family || null;
+    if (!id) return res.redirect("/admin?tab=stations");
+    if (filter === "") filter = null;
+
+    const update = () => {
+      db.query(
+        "UPDATE stations SET name=?, type=?, order_type_filter=?, bg_color=?, primary_color=?, font_family=? WHERE id=?",
+        [name, type, filter, bg, primary, font, id],
+        (err) => {
+          if (err) {
+            logger.error("Error updating station:", err);
+            if (wantsJSON) return res.status(500).json({ error: "DB Error" });
+          }
+          if (wantsJSON) {
+            return res.json({
+              station: {
+                id: parseInt(id, 10),
+                name,
+                type,
+                order_type_filter: filter,
+                bg_color: bg,
+                primary_color: primary,
+                font_family: font,
+              },
+            });
+          }
+          res.redirect("/admin?tab=stations&msg=Station+saved");
+        },
+      );
+    };
+
+    update();
+  });
+
+  router.post("/admin/stations/delete", (req, res) => {
+    const id = req.body.id;
+    if (!id) return res.redirect("/admin?tab=stations");
+    db.query("DELETE FROM stations WHERE id=?", [id], (err) => {
+      if (err) logger.error("Error deleting station:", err);
+      res.redirect("/admin?tab=stations&msg=Station+deleted");
+    });
+  });
+
+  router.get("/admin/theme", (req, res) => {
+    res.redirect("/admin?tab=theme");
+  });
+
+  router.post("/admin/settings", (req, res) => {
+    const { settings, errors } = validateSettings(req.body);
+    if (errors.length) {
+      return res.redirect("/admin?tab=theme&err=Invalid+settings");
+    }
+    const keys = Object.keys(settings);
+    if (keys.length === 0) return res.redirect("/admin?tab=theme");
+
+    let remaining = keys.length;
+    keys.forEach((key) => {
+      const value = settings[key];
+      const sql =
+        "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)";
+      db.query(sql, [key, value], (err) => {
+        if (err) logger.error("Error saving setting:", err);
+        if (--remaining === 0) {
+          settingsCache.loadSettings(db);
+          res.redirect("/admin?tab=theme&msg=Settings+saved");
+        }
+      });
+    });
+  });
+
+  router.get("/admin/updates", (req, res) => {
+    res.redirect("/admin?tab=updates");
+  });
+
+  router.get("/admin/updates/info", (req, res) => {
+    try {
+      const commit = execSync("git rev-parse --short HEAD").toString().trim();
+      const date = execSync("git log -1 --format=%cd").toString().trim();
+      const log = execSync("git log -5 --format=%h %s --date=short")
+        .toString()
+        .trim()
+        .split("\n");
+      res.json({ commit, date, log });
+    } catch (err) {
+      logger.error("Error reading git info:", err);
+      res.status(500).json({ error: "Failed" });
+    }
+  });
+
+  router.get("/admin/updates/latest", async (req, res) => {
+    if (!config.githubRepo) {
+      return res.status(400).json({ error: "Repository not configured" });
+    }
+    if (releaseCache && Date.now() - releaseCacheTime < RELEASE_CACHE_TTL) {
+      return res.json(releaseCache);
+    }
+    try {
+      const url = `https://api.github.com/repos/${config.githubRepo}/releases/latest`;
+      const response = await fetch(url, { headers: { "User-Agent": "FreeKDS" } });
+      if (!response.ok) throw new Error(`Status ${response.status}`);
+      const data = await response.json();
+      releaseCache = {
+        tag_name: data.tag_name,
+        name: data.name,
+        body: data.body,
+        html_url: data.html_url,
+      };
+      releaseCacheTime = Date.now();
+      res.json(releaseCache);
+    } catch (err) {
+      logger.error("Error fetching release info:", err);
+      res.status(500).json({ error: "Failed" });
+    }
+  });
+
+  router.post("/admin/updates/apply", async (req, res) => {
+    const user = req.session.user;
+    if (!user || !hasLevel(user.role, "management")) {
+      await logSecurityEvent(db, "update", user && user.id, req.originalUrl, false, req.ip);
+      return res.status(403).json({ error: "Forbidden" });
+    }
+    try {
+      let repoClean = false;
+      try {
+        const status = execSync("git status --porcelain").toString().trim();
+        repoClean = status === "";
+      } catch (e) {
+        repoClean = false;
+      }
+      if (repoClean) {
+        execSync("git pull --ff-only", { stdio: "ignore" });
+        await logSecurityEvent(db, "update", user.id, req.originalUrl, true, req.ip);
+        return res.json({ success: true });
+      }
+      if (!config.githubRepo) {
+        await logSecurityEvent(db, "update", user.id, req.originalUrl, false, req.ip);
+        return res.status(400).json({ error: "Dirty repository" });
+      }
+      const relRes = await fetch(`https://api.github.com/repos/${config.githubRepo}/releases/latest`, { headers: { "User-Agent": "FreeKDS" } });
+      if (!relRes.ok) throw new Error("release");
+      const rel = await relRes.json();
+      const zipUrl = rel.zipball_url;
+      if (!zipUrl) throw new Error("archive");
+      const fileRes = await fetch(zipUrl);
+      if (!fileRes.ok) throw new Error("download");
+      await logSecurityEvent(db, "update", user.id, req.originalUrl, true, req.ip);
+      res.json({ success: true });
+    } catch (err) {
+      logger.error("Update apply failed:", err);
+      await logSecurityEvent(db, "update", user && user.id, req.originalUrl, false, req.ip);
+      res.status(500).json({ error: "Failed" });
+    }
+  });
+
+  router.get("/foh/order", async (req, res) => {
+    if (!req.session.user || !roleHasAccess(req.session.user.role, "order")) {
+      return res.status(403).send("Forbidden");
+    }
+    const table = req.query.table || "";
+    const sqlItems =
+      "SELECT id, name, price, image_url, category_id, is_available, stock FROM menu_items ORDER BY category_id, sort_order, id";
+    const sqlItemMods = "SELECT * FROM item_modifiers";
+    const sqlItemGroups = "SELECT * FROM item_modifier_groups";
+    const sqlMods = "SELECT id, name, group_id FROM modifiers";
+    const sqlGroups = "SELECT id, name FROM modifier_groups";
+    try {
+      const [
+        cats,
+        [items],
+        [itemMods],
+        [itemGroups],
+        [mods],
+        [groups],
+      ] = await Promise.all([
+        getCategories(db),
+        db.promise().query(sqlItems),
+        db.promise().query(sqlItemMods),
+        db.promise().query(sqlItemGroups),
+        db.promise().query(sqlMods),
+        db.promise().query(sqlGroups),
+      ]);
+
+      const modMap = {};
+      mods.forEach((m) => {
+        modMap[m.id] = {
+          id: m.id,
+          name: m.name,
+          group_id: m.group_id,
+        };
+      });
+      const itemGroupsMap = {};
+      itemGroups.forEach((g) => {
+        if (!itemGroupsMap[g.menu_item_id])
+          itemGroupsMap[g.menu_item_id] = [];
+        itemGroupsMap[g.menu_item_id].push(g.group_id);
+      });
+      const itemModsMap = {};
+      itemMods.forEach((im) => {
+        const grp = modMap[im.modifier_id]
+          ? modMap[im.modifier_id].group_id
+          : null;
+        const allowed = itemGroupsMap[im.menu_item_id] || [];
+        if (grp && !allowed.includes(grp)) return;
+        if (!itemModsMap[im.menu_item_id])
+          itemModsMap[im.menu_item_id] = [];
+        if (modMap[im.modifier_id])
+          itemModsMap[im.menu_item_id].push(modMap[im.modifier_id]);
+      });
+      const catMap = cats.map((c) => ({
+        id: c.id,
+        name: c.name,
+        items: [],
+      }));
+      const idx = {};
+      catMap.forEach((c) => {
+        idx[c.id] = c;
+      });
+      items.forEach((it) => {
+        if (
+          idx[it.category_id] &&
+          it.is_available &&
+          (it.stock === null || it.stock > 0)
+        ) {
+          idx[it.category_id].items.push({
+            id: it.id,
+            name: it.name,
+            price: it.price,
+            image_url: it.image_url,
+            modifiers: itemModsMap[it.id] || [],
+            stock: it.stock,
+            is_available: it.is_available,
+          });
+        }
+      });
+      res.render("order-foh", {
+        categories: catMap,
+        table,
+        settings: res.locals.settings,
+        modGroups: groups,
+      });
+    } catch (err) {
+      logger.error(err);
+      res.status(500).send("DB Error");
+    }
+  });
+
+  return router;
+};
+
 
EOF
)
