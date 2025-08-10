const express = require("express");
const logger = require("../../../utils/logger");

module.exports = (db) => {
  const router = express.Router();

  router.post("/", (req, res) => {
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
          if (err) logger.error(err);
          if (tagIds.length === 0) return cb();
          const values = tagIds.map((tid) => [ingId, tid]);
          db.query(
            "INSERT INTO ingredient_tags (ingredient_id, tag_id) VALUES ?",
            [values],
            (err2) => {
              if (err2) logger.error(err2);
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
          if (err) logger.error("Error updating ingredient:", err);
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
            logger.error("Error inserting ingredient:", err);
            return res.redirect("/admin?tab=inventory");
          }
          saveTags(result.insertId, () => {
            res.redirect("/admin?tab=inventory&msg=Ingredient+saved");
          });
        },
      );
    }
  });

  router.post("/delete", (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect("/admin?tab=inventory");
    db.query("DELETE FROM ingredients WHERE id=?", [id], (err) => {
      if (err) {
        logger.error("Error deleting ingredient:", err);
        return res.redirect(
          "/admin?tab=inventory&error=Unable+to+delete+ingredient",
        );
      }
      res.redirect("/admin?tab=inventory&msg=Ingredient+deleted");
    });
  });

  router.get("/list", async (req, res) => {
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
      logger.error("Error fetching ingredient list:", err);
      res.status(500).json({ error: "DB Error" });
    }
  });

  return router;
};

