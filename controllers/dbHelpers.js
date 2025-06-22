const { convert } = require('./unitConversion');

function updateItemModifiers(db, itemId, modifierRows, callback) {
  let rows = [];
  if (Array.isArray(modifierRows)) {
    rows = modifierRows;
  }
  db.query('DELETE FROM item_modifiers WHERE menu_item_id=?', [itemId], err => {
    if (err) { console.error(err); }
    if (rows.length === 0) return callback();
    const values = rows.map(m => [itemId, m.modifier_id, m.replaces_ingredient_id || null]);
    db.query('INSERT INTO item_modifiers (menu_item_id, modifier_id, replaces_ingredient_id) VALUES ?', [values], err2 => {
      if (err2) { console.error(err2); }
      callback();
    });
  });
}

function updateItemGroups(db, itemId, groupIds, callback) {
  const rows = Array.isArray(groupIds) ? groupIds.filter(g => g).map(g => [itemId, g]) : [];
  db.query('DELETE FROM item_modifier_groups WHERE menu_item_id=?', [itemId], err => {
    if (err) { console.error(err); }
    if (rows.length === 0) return callback && callback();
    db.query('INSERT INTO item_modifier_groups (menu_item_id, group_id) VALUES ?', [rows], err2 => {
      if (err2) { console.error(err2); }
      if (callback) callback();
    });
  });
}

function getBumpedOrders(db, stationId, callback, limit = 20) {
  const infoSql = `SELECT bo.order_id,
                          COALESCE(bo.order_number, o.order_number) AS order_number,
                          o.order_type,
                          o.special_instructions,
                          o.allergy,
                          UNIX_TIMESTAMP(o.created_at) AS ts
                   FROM bumped_orders bo
                   LEFT JOIN orders o ON bo.order_id = o.id
                   WHERE bo.station_id=?
                   ORDER BY bo.bumped_at DESC
                   LIMIT ?`;
  db.query(infoSql, [stationId, limit], (err, infoRows) => {
    if (err || infoRows.length === 0) return callback(err, []);
    const orderIds = infoRows.map(r => r.order_id);
    const itemsSql = `SELECT oi.order_id, oi.quantity, mi.name, mi.station_id,
                             mi.id AS item_id,
                             GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS modifiers
                      FROM order_items oi
                      JOIN menu_items mi ON oi.menu_item_id = mi.id
                      LEFT JOIN order_item_modifiers oim ON oi.id = oim.order_item_id
                      LEFT JOIN modifiers m ON oim.modifier_id = m.id
                      WHERE oi.order_id IN (?)
                      GROUP BY oi.id
                      ORDER BY oi.order_id, oi.id`;
    db.query(itemsSql, [orderIds], (err2, itemRows) => {
      if (err2) return callback(err2);
      const ordersMap = {};
      infoRows.forEach(r => {
        ordersMap[r.order_id] = {
          order_id: r.order_id,
          order_number: r.order_number,
          order_type: r.order_type,
          special_instructions: r.special_instructions || '',
          allergy: !!r.allergy,
          ts: r.ts,
          items: []
        };
      });
      itemRows.forEach(row => {
        if (ordersMap[row.order_id]) {
          ordersMap[row.order_id].items.push({
            quantity: row.quantity,
            name: row.name,
            stationId: row.station_id,
            itemId: row.item_id,
            modifiers: row.modifiers ? row.modifiers.split(', ') : []
          });
        }
      });
      const ordered = infoRows.map(r => ordersMap[r.order_id]);
      callback(null, ordered);
    });
  });
}

async function getMenuData(db) {
  const queries = [
    db.promise().query('SELECT * FROM categories ORDER BY sort_order, id'),
    db.promise().query('SELECT * FROM stations ORDER BY name'),
    db.promise().query(`SELECT i.id, i.name, i.price, i.recipe, i.image_url,
                               i.station_id, i.category_id, i.sort_order,
                               s.name AS station_name
                        FROM menu_items i
                        JOIN stations s ON i.station_id = s.id
                        ORDER BY i.category_id, i.sort_order, i.id`),
    db.promise().query(`SELECT m.*, ing.name AS ingredient_name
                        FROM modifiers m
                        LEFT JOIN ingredients ing ON m.ingredient_id = ing.id
                        ORDER BY m.name`),
    db.promise().query('SELECT * FROM modifier_groups ORDER BY name'),
    db.promise().query('SELECT * FROM item_modifiers'),
    db.promise().query('SELECT * FROM item_modifier_groups'),
    db.promise().query(`SELECT ing.id, ing.name, ing.quantity, ing.unit_id, u.abbreviation AS unit, ing.sku, ing.cost, ing.is_public
                         FROM ingredients ing
                         LEFT JOIN units u ON ing.unit_id = u.id
                         WHERE ing.is_public=1
                         ORDER BY ing.name`),
    db.promise().query(`SELECT ii.menu_item_id, ii.ingredient_id, ii.amount, ii.unit_id, u.abbreviation AS unit
                         FROM item_ingredients ii
                         LEFT JOIN units u ON ii.unit_id = u.id`),
    db.promise().query('SELECT * FROM units ORDER BY name')
  ];
  const [cats, stations, items, mods, modGroups, itemMods, itemGroups, ingredients, itemIngs, units] = (await Promise.all(queries)).map(r => r[0]);
  const itemModsMap = {};
  itemMods.forEach(link => {
    if (!itemModsMap[link.menu_item_id]) itemModsMap[link.menu_item_id] = [];
    itemModsMap[link.menu_item_id].push({ modifier_id: link.modifier_id, replaces_ingredient_id: link.replaces_ingredient_id });
  });

  const itemGroupsMap = {};
  itemGroups.forEach(link => {
    if (!itemGroupsMap[link.menu_item_id]) itemGroupsMap[link.menu_item_id] = [];
    itemGroupsMap[link.menu_item_id].push(link.group_id);
  });

  const modMap = {};
  mods.forEach(m => {
    modMap[m.id] = {
      name: m.name,
      price: m.price,
      ingredient_id: m.ingredient_id,
      ingredient_name: m.ingredient_name
    };
  });
  const itemIngMap = {};
  itemIngs.forEach(ing => {
    if (!itemIngMap[ing.menu_item_id]) itemIngMap[ing.menu_item_id] = [];
    itemIngMap[ing.menu_item_id].push({
      ingredient_id: ing.ingredient_id,
      amount: ing.amount,
      unit_id: ing.unit_id,
      unit: ing.unit
    });
  });

  const categories = cats.map(c => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    items: []
  }));
  const catIndex = {};
  categories.forEach(c => { catIndex[c.id] = c; });

  items.forEach(row => {
    const item = {
      id: row.id,
      name: row.name,
      price: row.price,
      recipe: row.recipe,
      image_url: row.image_url,
      station_id: row.station_id,
      station_name: row.station_name,
      category_id: row.category_id,
      sort_order: row.sort_order,
      group_ids: itemGroupsMap[row.id] || [],
      modifier_ids: itemModsMap[row.id] ? itemModsMap[row.id].map(m => m.modifier_id) : [],
      modifier_replacements: itemModsMap[row.id] ? Object.fromEntries(itemModsMap[row.id].map(m => [m.modifier_id, m.replaces_ingredient_id])) : {},
      ingredients: itemIngMap[row.id] ? itemIngMap[row.id] : []
    };
    if (item.modifier_ids.length) {
      const names = item.modifier_ids.map(mid => modMap[mid].name);
      item.modifierNamesStr = names.join(', ');
    } else {
      item.modifierNamesStr = '';
    }
    if (catIndex[item.category_id]) {
      catIndex[item.category_id].items.push(item);
    }
  });

  return { categories, stations, mods, modGroups, ingredients, units };
}

async function getStations(db) {
  const [rows] = await db.promise().query('SELECT * FROM stations ORDER BY id');
  return rows;
}
async function getUnits(db) {
  const [rows] = await db.promise().query('SELECT * FROM units ORDER BY name');
  return rows;
}


async function getCategories(db) {
  const [rows] = await db.promise().query('SELECT * FROM categories ORDER BY sort_order, id');
  return rows;
}
async function getIngredients(db) {
const [rows] = await db.promise().query(`SELECT ing.id, ing.name, ing.quantity, ing.unit_id, u.abbreviation AS unit, ing.sku, ing.cost, ing.is_public
                                         FROM ingredients ing
                                         LEFT JOIN units u ON ing.unit_id = u.id
                                         ORDER BY ing.name`);
  return rows;
}

function updateItemIngredients(db, itemId, ingList, callback) {
  let rows = [];
  if (Array.isArray(ingList)) {
    rows = ingList.filter(r => r.ingredient_id && r.amount)
      .map(r => [itemId, r.ingredient_id, r.amount, r.unit_id || null]);
  }
  db.query('DELETE FROM item_ingredients WHERE menu_item_id=?', [itemId], err => {
    if (err) { console.error(err); }
    if (rows.length === 0) return callback && callback();
    db.query('INSERT INTO item_ingredients (menu_item_id, ingredient_id, amount, unit_id) VALUES ?', [rows], err2 => {
      if (err2) console.error(err2);
      if (callback) callback();
    });
  });
}

async function logInventoryForOrder(db, orderId, items) {
  for (const it of items) {
    const [ings] = await db.promise().query(
      `SELECT ii.ingredient_id, ii.amount, ii.unit_id AS item_unit_id, ing.unit_id AS ing_unit_id
         FROM item_ingredients ii
         JOIN ingredients ing ON ii.ingredient_id = ing.id
        WHERE ii.menu_item_id=?`,
      [it.menu_item_id]
    );
    let replaced = [];
    let modRows = [];
    if (Array.isArray(it.modifier_ids) && it.modifier_ids.length) {
      const [rows] = await db.promise().query(
        `SELECT m.ingredient_id, im.replaces_ingredient_id
           FROM item_modifiers im
           JOIN modifiers m ON im.modifier_id = m.id
          WHERE im.menu_item_id=? AND im.modifier_id IN (?) AND m.ingredient_id IS NOT NULL`,
        [it.menu_item_id, it.modifier_ids]
      );
      modRows = rows;
      replaced = rows.map(r => r.replaces_ingredient_id).filter(Boolean);
    }

    for (const row of ings) {
      if (replaced.includes(row.ingredient_id)) continue;
      const conv = convert(parseFloat(row.amount), row.item_unit_id || row.ing_unit_id, row.ing_unit_id);
      const used = conv !== null ? conv * it.quantity : parseFloat(row.amount) * it.quantity;
      await db.promise().query('UPDATE ingredients SET quantity = quantity - ? WHERE id=?', [used, row.ingredient_id]);
      await db.promise().query('INSERT INTO inventory_log (order_id, menu_item_id, ingredient_id, amount) VALUES (?, ?, ?, ?)', [orderId, it.menu_item_id, row.ingredient_id, used]);
    }

    for (const modRow of modRows) {
      const used = 1 * it.quantity;
      await db.promise().query('UPDATE ingredients SET quantity = quantity - ? WHERE id=?', [used, modRow.ingredient_id]);
      await db.promise().query('INSERT INTO inventory_log (order_id, menu_item_id, ingredient_id, amount) VALUES (?, ?, ?, ?)', [orderId, it.menu_item_id, modRow.ingredient_id, used]);
    }
  }
}

function formatDateTime(dt) {
  if (typeof dt === 'string') dt = new Date(dt);
  return dt.toISOString().slice(0, 19).replace('T', ' ');
}

async function getSalesTotals(db, start, end) {
  const endDate = end ? new Date(end) : new Date();
  const startDate = start ? new Date(start) : new Date(endDate.getTime() - 29 * 86400000);
  const sql = `SELECT DATE(o.created_at) AS date, SUM(mi.price * oi.quantity) AS total
               FROM orders o
               JOIN order_items oi ON o.id = oi.order_id
               JOIN menu_items mi ON oi.menu_item_id = mi.id
               WHERE o.created_at BETWEEN ? AND ?
               GROUP BY DATE(o.created_at)
               ORDER BY DATE(o.created_at)`;
  const [rows] = await db.promise().query(sql, [formatDateTime(startDate), formatDateTime(endDate)]);
  return rows;
}

async function getIngredientUsage(db, start, end) {
  const endDate = end ? new Date(end) : new Date();
  const startDate = start ? new Date(start) : new Date(endDate.getTime() - 29 * 86400000);
  const sql = `SELECT ing.name, SUM(l.amount) AS total
               FROM inventory_log l
               JOIN ingredients ing ON l.ingredient_id = ing.id
               WHERE l.created_at BETWEEN ? AND ?
               GROUP BY ing.id
               ORDER BY ing.name`;
  const [rows] = await db.promise().query(sql, [formatDateTime(startDate), formatDateTime(endDate)]);
  return rows;
}

module.exports = {
  updateItemModifiers,
  updateItemGroups,
  getBumpedOrders,
  getMenuData,
  getStations,
  getCategories,
  getIngredients,
  updateItemIngredients,
  getUnits,
  logInventoryForOrder,
  getSalesTotals,
  getIngredientUsage
};
