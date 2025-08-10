const logger = require('../../utils/logger');
const { query } = require('../../utils/db');

async function updateItemModifiers(db, itemId, modifierRows) {
  const rows = Array.isArray(modifierRows) ? modifierRows : [];
  try {
    await query(db, 'DELETE FROM item_modifiers WHERE menu_item_id=?', [itemId]);
    if (!rows.length) return;
    const values = rows.map((m) => [
      itemId,
      m.modifier_id,
      m.replaces_ingredient_id || null,
    ]);
    await query(
      db,
      'INSERT INTO item_modifiers (menu_item_id, modifier_id, replaces_ingredient_id) VALUES ?',
      [values],
    );
  } catch (err) {
    logger.error(err);
    throw err;
  }
}

async function updateItemGroups(db, itemId, groupIds) {
  const rows = Array.isArray(groupIds)
    ? groupIds.filter((g) => g).map((g) => [itemId, g])
    : [];
  try {
    await query(
      db,
      'DELETE FROM item_modifier_groups WHERE menu_item_id=?',
      [itemId],
    );
    if (!rows.length) return;
    await query(
      db,
      'INSERT INTO item_modifier_groups (menu_item_id, group_id) VALUES ?',
      [rows],
    );
  } catch (err) {
    logger.error(err);
    throw err;
  }
}

async function updateMenuItem(db, itemId, fields) {
  const sets = [];
  const params = [];
  if (fields && typeof fields === 'object') {
    if (fields.price !== undefined) {
      sets.push('price=?');
      params.push(fields.price);
    }
    const rawStock = fields.stock ?? fields.stock_count ?? fields.available_qty;
    if (rawStock !== undefined) {
      const stockVal = parseInt(rawStock, 10);
      sets.push('stock=?');
      params.push(stockVal);
      if (stockVal <= 0 && fields.is_available === undefined) {
        sets.push('is_available=0');
      }
    }
    if (fields.is_available !== undefined) {
      sets.push('is_available=?');
      params.push(fields.is_available ? 1 : 0);
    }
  }
  if (!sets.length) return;
  params.push(itemId);
  try {
    await query(
      db,
      `UPDATE menu_items SET ${sets.join(', ')} WHERE id=?`,
      params,
    );
  } catch (err) {
    logger.error('Error updating menu item:', err);
    throw err;
  }
}

async function getMenuData(db) {
  const queries = [
    query(db, 'SELECT * FROM categories ORDER BY sort_order, id'),
    query(db, 'SELECT * FROM stations ORDER BY name'),
    query(db, `SELECT i.id, i.name, i.price, i.recipe, i.image_url,
                               i.station_id, i.category_id, i.sort_order,
                               i.is_available, i.stock,
                               s.name AS station_name
                        FROM menu_items i
                        JOIN stations s ON i.station_id = s.id
                        ORDER BY i.category_id, i.sort_order, i.id`),
    query(db, `SELECT m.*, ing.name AS ingredient_name
                        FROM modifiers m
                        LEFT JOIN ingredients ing ON m.ingredient_id = ing.id
                        ORDER BY m.name`),
    query(db, 'SELECT * FROM modifier_groups ORDER BY name'),
    query(db, 'SELECT * FROM item_modifiers'),
    query(db, 'SELECT * FROM item_modifier_groups'),
    query(
      db,
      `SELECT ing.id, ing.name, ing.quantity, ing.unit_id, u.abbreviation AS unit, ing.sku, ing.cost, ing.is_public
                         FROM ingredients ing
                         LEFT JOIN units u ON ing.unit_id = u.id
                         WHERE ing.is_public=1
                         ORDER BY ing.name`),
    query(
      db,
      `SELECT ii.menu_item_id, ii.ingredient_id, ii.amount, ii.unit_id, u.abbreviation AS unit
                         FROM item_ingredients ii
                         LEFT JOIN units u ON ii.unit_id = u.id`),
    query(db, 'SELECT * FROM units ORDER BY name'),
  ];
  const [
    cats,
    stations,
    items,
    mods,
    modGroups,
    itemMods,
    itemGroups,
    publicIngredients,
    itemIngs,
    units,
  ] = (await Promise.all(queries)).map((r) => r[0]);
  const itemModsMap = {};
  itemMods.forEach((link) => {
    if (!itemModsMap[link.menu_item_id]) itemModsMap[link.menu_item_id] = [];
    itemModsMap[link.menu_item_id].push({
      modifier_id: link.modifier_id,
      replaces_ingredient_id: link.replaces_ingredient_id,
    });
  });

  const itemGroupsMap = {};
  itemGroups.forEach((link) => {
    if (!itemGroupsMap[link.menu_item_id])
      itemGroupsMap[link.menu_item_id] = [];
    itemGroupsMap[link.menu_item_id].push(link.group_id);
  });

  const modMap = {};
  mods.forEach((m) => {
    modMap[m.id] = {
      name: m.name,
      price: m.price,
      ingredient_id: m.ingredient_id,
      ingredient_name: m.ingredient_name,
    };
  });
  const itemIngMap = {};
  itemIngs.forEach((ing) => {
    if (!itemIngMap[ing.menu_item_id]) itemIngMap[ing.menu_item_id] = [];
    itemIngMap[ing.menu_item_id].push({
      ingredient_id: ing.ingredient_id,
      amount: ing.amount,
      unit_id: ing.unit_id,
      unit: ing.unit,
    });
  });

  const categories = cats.map((c) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    items: [],
  }));
  const catIndex = {};
  categories.forEach((c) => {
    catIndex[c.id] = c;
  });

  items.forEach((row) => {
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
      modifier_ids: itemModsMap[row.id]
        ? itemModsMap[row.id].map((m) => m.modifier_id)
        : [],
      modifier_replacements: itemModsMap[row.id]
        ? Object.fromEntries(
            itemModsMap[row.id].map((m) => [
              m.modifier_id,
              m.replaces_ingredient_id,
            ]),
          )
        : {},
      ingredients: itemIngMap[row.id] ? itemIngMap[row.id] : [],
    };
    if (item.modifier_ids.length) {
      const names = item.modifier_ids.map((mid) => modMap[mid].name);
      item.modifierNamesStr = names.join(', ');
    } else {
      item.modifierNamesStr = '';
    }
    if (catIndex[item.category_id]) {
      catIndex[item.category_id].items.push(item);
    }
  });

  return {
    categories,
    stations,
    mods,
    modGroups,
    publicIngredients,
    units,
  };
}

async function getStations(db) {
  const [rows] = await query(db, 'SELECT * FROM stations ORDER BY id');
  return rows;
}

async function getCategories(db) {
  const [rows] = await query(
    db,
    'SELECT * FROM categories ORDER BY sort_order, id',
  );
  return rows;
}

async function updateItemIngredients(db, itemId, ingList) {
  let rows = [];
  if (Array.isArray(ingList)) {
    rows = ingList
      .filter((r) => r.ingredient_id && r.amount)
      .map((r) => [itemId, r.ingredient_id, r.amount, r.unit_id || null]);
  }
  try {
    await query(db, 'DELETE FROM item_ingredients WHERE menu_item_id=?', [itemId]);
    if (!rows.length) return;
    await query(
      db,
      'INSERT INTO item_ingredients (menu_item_id, ingredient_id, amount, unit_id) VALUES ?',
      [rows],
    );
  } catch (err) {
    logger.error(err);
    throw err;
  }
}

module.exports = {
  updateItemModifiers,
  updateItemGroups,
  updateMenuItem,
  getMenuData,
  getStations,
  getCategories,
  updateItemIngredients,
};
