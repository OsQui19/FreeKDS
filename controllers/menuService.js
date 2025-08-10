async function getFohMenuData(db) {
  const sqlItems = 'SELECT id, name, price, image_url, category_id, is_available, stock FROM menu_items ORDER BY category_id, sort_order, id';
  const sqlItemMods = 'SELECT * FROM item_modifiers';
  const sqlItemGroups = 'SELECT * FROM item_modifier_groups';
  const sqlMods = 'SELECT id, name, group_id FROM modifiers';
  const sqlGroups = 'SELECT id, name FROM modifier_groups';
  const dbp = db.promise();
  const [[items], [itemMods], [itemGroups], [mods], [groups]] = await Promise.all([
    dbp.query(sqlItems),
    dbp.query(sqlItemMods),
    dbp.query(sqlItemGroups),
    dbp.query(sqlMods),
    dbp.query(sqlGroups),
  ]);
  return { items, itemMods, itemGroups, mods, groups };
}

module.exports = { getFohMenuData };

