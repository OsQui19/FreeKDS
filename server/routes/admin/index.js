const express = require("express");
const logger = require("../../../utils/logger");
const { exec } = require("child_process");
const config = require("../../../config");
const accessControl = require("../../controllers/accessControl");
const menuDb = require("../../controllers/db/menu");
const inventoryDb = require("../../controllers/db/inventory");

const backupsRoutes = require("./backups");
const menuRoutes = require("./menu");
const inventoryRoutes = require("./inventory");

module.exports = (db, transports) => {
  const { io } = transports;
  const router = express.Router();

  router.use("/", backupsRoutes(db));
  router.use("/", menuRoutes(db));
  router.use("/", inventoryRoutes(db));

  router.get("/admin", async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const allowedModules = accessControl.getRolePermissions(
      req.session.user.role,
    );
    const viewData = { allowedModules, modules: accessControl.MODULE_GROUPS };
    try {
      if (allowedModules.includes("menu") || allowedModules.includes("stations")) {
        const menuData = await menuDb.getMenuData(db);
        Object.assign(viewData, menuData);
      } else if (allowedModules.includes("stations")) {
        const stations = await menuDb.getStations(db);
        viewData.stations = stations;
      }
      if (allowedModules.includes("inventory")) {
        const [units, itemCategories, tags, ingredients, suppliers, orders, locations] = await Promise.all([
          inventoryDb.getUnits(db),
          inventoryDb.getItemCategories(db),
          inventoryDb.getTags(db),
          inventoryDb.getIngredients(db),
          inventoryDb.getSuppliers(db),
          inventoryDb.getPurchaseOrders(db),
          inventoryDb.getLocations(db),
        ]);
        Object.assign(viewData, {
          units,
          itemCategories,
          tags,
          ingredients,
          suppliers,
          orders,
          locations,
          summary: [],
          logs: [],
        });
      }
      res.json(viewData);
    } catch (err) {
      logger.error("Error loading admin dashboard:", err);
      res.status(500).send("Server Error");
    }
  });

  router.get("/admin/updates/latest", async (req, res) => {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${config.githubRepo}/releases/latest`,
      );
      if (!resp.ok) {
        return res
          .status(resp.status || 500)
          .json({ error: "Failed to fetch release info" });
      }
      const data = await resp.json();
      res.json(data);
    } catch (err) {
      logger.error("Error fetching release info:", err);
      res.status(500).json({ error: "Failed to fetch release info" });
    }
  });

  router.post("/admin/updates/apply", (req, res) => {
    if (!req.session.user || req.session.user.role !== "management") {
      return res.status(403).send("Forbidden");
    }

    const opts = { timeout: 15000 };

    exec("git status --porcelain", opts, (statusErr, stdout, stderr) => {
      if (statusErr) {
        logger.error("git status error:", statusErr);
        return res.status(500).json({ error: "Update failed" });
      }
      if (stdout.trim()) {
        return res.status(400).send("Repo dirty");
      }

      exec("git pull", opts, (pullErr) => {
        if (pullErr) {
          logger.error("git pull error:", pullErr);
          return res.status(500).json({ error: "Update failed" });
        }
        res.json({ success: true });
      });
    });
  });

  return router;
};

