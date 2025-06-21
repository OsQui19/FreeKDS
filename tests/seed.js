const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'freekds',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'kds_db'
  });

  await db.query('SET FOREIGN_KEY_CHECKS=0');
  const tables = [
    'order_item_modifiers',
    'order_items',
    'orders',
    'item_modifiers',
    'modifiers',
    'modifier_groups',
    'menu_items',
    'categories',
    'stations',
    'ingredients',
    'item_ingredients',
    'inventory_log',
    'inventory_transactions',
    'bumped_orders'
  ];
  for (const t of tables) {
    try {
      await db.query(`TRUNCATE TABLE \`${t}\``);
    } catch (err) {
      console.error(`Unable to truncate ${t}:`, err.message);
    }
  }
  await db.query('SET FOREIGN_KEY_CHECKS=1');

  const stations = [
    { name: 'Grill', type: 'prep' },
    { name: 'Salad', type: 'prep' },
    { name: 'Expo', type: 'expo' }
  ];
  for (const s of stations) {
    await db.query('INSERT INTO stations (name, type) VALUES (?, ?)', [s.name, s.type]);
  }

  const [stationRows] = await db.query('SELECT id, name FROM stations');
  const stationMap = Object.fromEntries(stationRows.map(r => [r.name, r.id]));

  const categories = [
    { name: 'Burgers', sort: 0 },
    { name: 'Salads', sort: 1 },
    { name: 'Drinks', sort: 2 }
  ];
  for (const c of categories) {
    await db.query('INSERT INTO categories (name, sort_order) VALUES (?, ?)', [c.name, c.sort]);
  }

  const [catRows] = await db.query('SELECT id, name FROM categories');
  const catMap = Object.fromEntries(catRows.map(r => [r.name, r.id]));

  const items = [
    { name: 'Classic Burger', category: 'Burgers', station: 'Grill', price: 10.99, recipe: 'Patty, bun, lettuce, tomato', order: 0 },
    { name: 'Veggie Burger', category: 'Burgers', station: 'Grill', price: 9.99, recipe: 'Veggie patty, bun, lettuce, tomato', order: 1 },
    { name: 'Caesar Salad', category: 'Salads', station: 'Salad', price: 8.99, recipe: 'Romaine, dressing, croutons', order: 0 },
    { name: 'Lemonade', category: 'Drinks', station: 'Expo', price: 2.50, recipe: 'Fresh lemons and sugar', order: 0 }
  ];
  for (const it of items) {
    await db.query(
      'INSERT INTO menu_items (name, category_id, station_id, price, recipe, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [it.name, catMap[it.category], stationMap[it.station], it.price, it.recipe, it.order]
    );
  }

  const [modGroupRes] = await db.query('INSERT INTO modifier_groups (name) VALUES (?)', ['Toppings']);
  const modGroupId = modGroupRes.insertId;
  const modifiers = [
    { name: 'Cheese', price: 0.5 },
    { name: 'Bacon', price: 1.0 },
    { name: 'Avocado', price: 1.5 }
  ];
  for (const m of modifiers) {
    await db.query('INSERT INTO modifiers (name, price, group_id) VALUES (?, ?, ?)', [m.name, m.price, modGroupId]);
  }

  const [modRows] = await db.query('SELECT id, name FROM modifiers');
  const modMap = Object.fromEntries(modRows.map(r => [r.name, r.id]));

  const itemMods = [
    { item: 'Classic Burger', mods: ['Cheese', 'Bacon', 'Avocado'] },
    { item: 'Veggie Burger', mods: ['Cheese', 'Avocado'] }
  ];
  const [itemRows] = await db.query('SELECT id, name FROM menu_items');
  const itemMap = Object.fromEntries(itemRows.map(r => [r.name, r.id]));

  for (const im of itemMods) {
    for (const mod of im.mods) {
      await db.query('INSERT INTO item_modifiers (menu_item_id, modifier_id) VALUES (?, ?)', [itemMap[im.item], modMap[mod]]);
    }
  }

  console.log('Seed data inserted successfully.');
  await db.end();
}

main().catch(err => {
  console.error('Error running seed script:', err);
});
