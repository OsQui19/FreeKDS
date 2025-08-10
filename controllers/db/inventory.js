const logger = require('../../utils/logger');
const { convert } = require('../unitConversion');

async function getUnits(db) {
  const [rows] = await db.promise().query('SELECT * FROM units ORDER BY name');
  return rows;
}

async function insertUnit(db, unit) {
  const { name, abbreviation, type, toBase } = unit;
  const sql = 'INSERT INTO units (name, abbreviation, type, to_base) VALUES (?, ?, ?, ?)';
  const [result] = await db.promise().query(sql, [name, abbreviation, type, toBase]);
  return result.insertId;
}

async function getItemCategories(db) {
  const [rows] = await db.promise().query('SELECT * FROM item_categories ORDER BY name');
  return rows;
}

async function getTags(db) {
  const [rows] = await db.promise().query('SELECT * FROM tags ORDER BY name');
  return rows;
}

async function getIngredients(db) {
  const [rows] = await db.promise().query(`SELECT ing.id, ing.name, ing.quantity, ing.unit_id,
                                                u.abbreviation AS unit, ing.sku, ing.cost,
                                                ing.is_public, ing.category_id,
                                                c.name AS category_name,
                                                GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') AS tags
                                         FROM ingredients ing
                                         LEFT JOIN units u ON ing.unit_id = u.id
                                         LEFT JOIN item_categories c ON ing.category_id = c.id
                                         LEFT JOIN ingredient_tags it ON ing.id = it.ingredient_id
                                         LEFT JOIN tags t ON it.tag_id = t.id
                                         GROUP BY ing.id
                                         ORDER BY ing.name`);
  return rows.map((r) => {
    const qty = parseFloat(r.quantity);
    const unitCost = parseFloat(r.cost);
    const totalCost = !isNaN(qty) && !isNaN(unitCost) ? qty * unitCost : unitCost;
    return { ...r, cost: totalCost };
  });
}

async function logInventoryForOrder(db, orderId, items) {
  const conn = typeof db.promise === 'function' ? db.promise() : db;
  const outOfStock = new Set();
  for (const it of items) {
    const [ings] = await conn.query(
      `SELECT ii.ingredient_id, ii.amount, ii.unit_id AS item_unit_id, ing.unit_id AS ing_unit_id
         FROM item_ingredients ii
         JOIN ingredients ing ON ii.ingredient_id = ing.id
        WHERE ii.menu_item_id=?`,
      [it.menu_item_id],
    );
    let replaced = [];
    let modRows = [];
    if (Array.isArray(it.modifier_ids) && it.modifier_ids.length) {
      const [rows] = await conn.query(
        `SELECT m.ingredient_id, im.replaces_ingredient_id
           FROM item_modifiers im
           JOIN modifiers m ON im.modifier_id = m.id
          WHERE im.menu_item_id=? AND im.modifier_id IN (?) AND m.ingredient_id IS NOT NULL`,
        [it.menu_item_id, it.modifier_ids],
      );
      modRows = rows;
      replaced = rows.map((r) => r.replaces_ingredient_id).filter(Boolean);
    }

    for (const row of ings) {
      if (replaced.includes(row.ingredient_id)) continue;
      const conv = convert(
        parseFloat(row.amount),
        row.item_unit_id || row.ing_unit_id,
        row.ing_unit_id,
      );
      const used =
        conv !== null
          ? conv * it.quantity
          : parseFloat(row.amount) * it.quantity;
      await conn.query('UPDATE ingredients SET quantity = quantity - ? WHERE id=?', [
          used,
          row.ingredient_id,
        ]);
      await conn.query(
          'INSERT INTO inventory_log (order_id, menu_item_id, ingredient_id, amount) VALUES (?, ?, ?, ?)',
          [orderId, it.menu_item_id, row.ingredient_id, used],
        );
    }

    for (const modRow of modRows) {
      const used = 1 * it.quantity;
      await conn.query('UPDATE ingredients SET quantity = quantity - ? WHERE id=?', [
          used,
          modRow.ingredient_id,
        ]);
      await conn.query(
          'INSERT INTO inventory_log (order_id, menu_item_id, ingredient_id, amount) VALUES (?, ?, ?, ?)',
          [orderId, it.menu_item_id, modRow.ingredient_id, used],
        );
    }

    const [stockRows] = await conn.query(
      'SELECT stock FROM menu_items WHERE id=? FOR UPDATE',
      [it.menu_item_id],
    );
    if (stockRows.length && stockRows[0].stock !== null) {
      let newStock = parseInt(stockRows[0].stock, 10) - (it.quantity || 0);
      if (newStock <= 0) {
        newStock = 0;
        await conn.query('UPDATE menu_items SET stock=?, is_available=0 WHERE id=?', [newStock, it.menu_item_id]);
        outOfStock.add(it.menu_item_id);
      } else {
        await conn.query('UPDATE menu_items SET stock=? WHERE id=?', [newStock, it.menu_item_id]);
      }
    }
  }
  return Array.from(outOfStock);
}

async function getSuppliers(db) {
  const [rows] = await db.promise().query('SELECT * FROM suppliers ORDER BY name');
  return rows;
}

async function getLocations(db) {
  const [rows] = await db.promise().query('SELECT * FROM inventory_locations ORDER BY name');
  return rows;
}

async function getPurchaseOrders(db) {
  const sql = `SELECT po.*, s.name AS supplier_name, l.name AS location_name
               FROM purchase_orders po
               LEFT JOIN suppliers s ON po.supplier_id = s.id
               LEFT JOIN inventory_locations l ON po.location_id = l.id
               ORDER BY po.order_date DESC, po.id DESC`;
  const [rows] = await db.promise().query(sql);
  return rows;
}

async function getPurchaseOrderItems(db, orderId) {
  const sql = `SELECT poi.*, ing.name AS ingredient_name, u.abbreviation AS unit
               FROM purchase_order_items poi
               JOIN ingredients ing ON poi.ingredient_id = ing.id
               LEFT JOIN units u ON poi.unit_id = u.id
               WHERE poi.purchase_order_id=?`;
  const [rows] = await db.promise().query(sql, [orderId]);
  return rows;
}

async function receivePurchaseOrder(db, orderId) {
  const items = await getPurchaseOrderItems(db, orderId);
  for (const it of items) {
    await db
      .promise()
      .query('UPDATE ingredients SET quantity=quantity+? WHERE id=?', [
        it.quantity,
        it.ingredient_id,
      ]);
    await db
      .promise()
      .query(
        'INSERT INTO inventory_transactions (ingredient_id, type, quantity) VALUES (?, "purchase", ?)',
        [it.ingredient_id, it.quantity],
      );
  }
  await db
    .promise()
    .query('UPDATE purchase_orders SET status="received" WHERE id=?', [
      orderId,
    ]);
}

module.exports = {
  getUnits,
  insertUnit,
  getItemCategories,
  getTags,
  getIngredients,
  logInventoryForOrder,
  getSuppliers,
  getLocations,
  getPurchaseOrders,
  getPurchaseOrderItems,
  receivePurchaseOrder,
};
