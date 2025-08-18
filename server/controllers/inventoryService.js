async function saveIngredientTags(db, ingredientId, tagIds = []) {
  await db.promise().query('DELETE FROM ingredient_tags WHERE ingredient_id=?', [ingredientId]);
  if (tagIds.length) {
    const values = tagIds.map((tid) => [ingredientId, tid]);
    await db.promise().query('INSERT INTO ingredient_tags (ingredient_id, tag_id) VALUES ?', [values]);
  }
}

async function createIngredient(db, data, tagIds = []) {
  const {
    name,
    quantity,
    unit,
    categoryId,
    sku,
    cost,
    isPublic,
  } = data;
  const [result] = await db
    .promise()
    .query(
      'INSERT INTO ingredients (name, quantity, unit_id, category_id, sku, cost, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, quantity, unit, categoryId, sku, cost, isPublic],
    );
  const id = result.insertId;
  await saveIngredientTags(db, id, tagIds);
  return id;
}

async function updateIngredient(db, id, data, tagIds = []) {
  const {
    name,
    quantity,
    unit,
    categoryId,
    sku,
    cost,
    isPublic,
  } = data;
  await db
    .promise()
    .query(
      'UPDATE ingredients SET name=?, quantity=?, unit_id=?, category_id=?, sku=?, cost=?, is_public=? WHERE id=?',
      [name, quantity, unit, categoryId, sku, cost, isPublic, id],
    );
  await saveIngredientTags(db, id, tagIds);
}

async function deleteIngredient(db, id) {
  await db.promise().query('DELETE FROM ingredients WHERE id=?', [id]);
}

async function listPublicIngredients(db) {
  const sql = `SELECT ing.id, ing.name, ing.quantity, ing.unit_id,
                    u.abbreviation AS unit, ing.sku, ing.cost, ing.is_public
               FROM ingredients ing
               LEFT JOIN units u ON ing.unit_id = u.id
               WHERE ing.is_public=1
               ORDER BY ing.name`;
  const [rows] = await db.promise().query(sql);
  return rows;
}

async function saveItemCategory(db, { id, name, parent_id }) {
  if (id) {
    await db
      .promise()
      .query('UPDATE item_categories SET name=?, parent_id=? WHERE id=?', [name, parent_id || null, id]);
  } else {
    await db
      .promise()
      .query('INSERT INTO item_categories (name, parent_id) VALUES (?, ?)', [name, parent_id || null]);
  }
}

async function deleteItemCategory(db, id) {
  await db.promise().query('DELETE FROM item_categories WHERE id=?', [id]);
}

async function createTag(db, name) {
  await db.promise().query('INSERT INTO tags (name) VALUES (?)', [name]);
}

async function updateTag(db, id, name) {
  await db.promise().query('UPDATE tags SET name=? WHERE id=?', [name, id]);
}

async function deleteTag(db, id) {
  await db.promise().query('DELETE FROM tags WHERE id=?', [id]);
}

async function recordInventoryTransaction(db, ingredientId, type, qty) {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO inventory_transactions (ingredient_id, type, quantity) VALUES (?, ?, ?)',
      [ingredientId, type, qty],
    );
    await conn.query('UPDATE ingredients SET quantity = quantity + ? WHERE id=?', [qty, ingredientId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  listPublicIngredients,
  saveItemCategory,
  deleteItemCategory,
  createTag,
  updateTag,
  deleteTag,
  recordInventoryTransaction,
};
