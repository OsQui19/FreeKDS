const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "freekds",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "kds_db",
  });

  await db.query("SET FOREIGN_KEY_CHECKS=0");
  const tables = [
    "order_item_modifiers",
    "order_items",
    "orders",
    "item_modifiers",
    "modifiers",
    "modifier_groups",
    "menu_items",
    "categories",
    "ingredient_tags",
    "tags",
    "item_categories",
    "stations",
    "ingredients",
    "item_ingredients",
    "inventory_log",
    "inventory_transactions",
    "bumped_orders",
    "daily_usage_log",
  ];
  for (const t of tables) {
    try {
      await db.query(`TRUNCATE TABLE \`${t}\``);
    } catch (err) {
      console.error(`Unable to truncate ${t}:`, err.message);
    }
  }
  await db.query("SET FOREIGN_KEY_CHECKS=1");

  const stations = [
    { name: "Grill", type: "prep" },
    { name: "Salad", type: "prep" },
    { name: "Expo", type: "expo" },
  ];
  for (const s of stations) {
    await db.query("INSERT INTO stations (name, type) VALUES (?, ?)", [
      s.name,
      s.type,
    ]);
  }

  const [stationRows] = await db.query("SELECT id, name FROM stations");
  const stationMap = Object.fromEntries(stationRows.map((r) => [r.name, r.id]));

  const categories = [
    { name: "Burgers", sort: 0 },
    { name: "Salads", sort: 1 },
    { name: "Drinks", sort: 2 },
  ];
  for (const c of categories) {
    await db.query("INSERT INTO categories (name, sort_order) VALUES (?, ?)", [
      c.name,
      c.sort,
    ]);
  }

  const [catRows] = await db.query("SELECT id, name FROM categories");
  const catMap = Object.fromEntries(catRows.map((r) => [r.name, r.id]));

  const items = [
    {
      name: "Classic Burger",
      category: "Burgers",
      station: "Grill",
      price: 10.99,
      recipe: "Patty, bun, lettuce, tomato",
      order: 0,
    },
    {
      name: "Veggie Burger",
      category: "Burgers",
      station: "Grill",
      price: 9.99,
      recipe: "Veggie patty, bun, lettuce, tomato",
      order: 1,
    },
    {
      name: "Caesar Salad",
      category: "Salads",
      station: "Salad",
      price: 8.99,
      recipe: "Romaine, dressing, croutons",
      order: 0,
    },
    {
      name: "Lemonade",
      category: "Drinks",
      station: "Expo",
      price: 2.5,
      recipe: "Fresh lemons and sugar",
      order: 0,
    },
  ];
  for (const it of items) {
    await db.query(
      "INSERT INTO menu_items (name, category_id, station_id, price, recipe, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [
        it.name,
        catMap[it.category],
        stationMap[it.station],
        it.price,
        it.recipe,
        it.order,
      ],
    );
  }

  const [modGroupRes] = await db.query(
    "INSERT INTO modifier_groups (name) VALUES (?)",
    ["Toppings"],
  );
  const modGroupId = modGroupRes.insertId;

  const itemCats = [
    { name: "Perishables", parent: null },
    { name: "Meat", parent: "Perishables" },
    { name: "Produce", parent: "Perishables" },
  ];
  const catIdMap = {};
  for (const c of itemCats) {
    const parentId = c.parent ? catIdMap[c.parent] : null;
    const [res] = await db.query(
      "INSERT INTO item_categories (name, parent_id) VALUES (?, ?)",
      [c.name, parentId],
    );
    catIdMap[c.name] = res.insertId;
  }

  const tagNames = ["Gluten-Free", "Organic"];
  for (const t of tagNames) {
    await db.query("INSERT INTO tags (name) VALUES (?)", [t]);
  }
  const [tagRows] = await db.query("SELECT id, name FROM tags");
  const tagMap = Object.fromEntries(tagRows.map((r) => [r.name, r.id]));

  const ingredientNames = ["Cheese", "Bacon", "Avocado"];
  const ingredientInfo = {
    Cheese: { cat: "Perishables", tags: ["Gluten-Free"] },
    Bacon: { cat: "Meat", tags: ["Gluten-Free"] },
    Avocado: { cat: "Produce", tags: ["Organic", "Gluten-Free"] },
  };
  for (const name of ingredientNames) {
    const catId = catIdMap[ingredientInfo[name].cat] || null;
    await db.query(
      "INSERT INTO ingredients (name, category_id) VALUES (?, ?)",
      [name, catId],
    );
    const [row] = await db.query("SELECT LAST_INSERT_ID() AS id");
    const ingId = row[0].id;
    for (const tag of ingredientInfo[name].tags) {
      await db.query(
        "INSERT INTO ingredient_tags (ingredient_id, tag_id) VALUES (?, ?)",
        [ingId, tagMap[tag]],
      );
    }
  }

  const [ingRows] = await db.query("SELECT id, name FROM ingredients");
  const ingMap = Object.fromEntries(ingRows.map((r) => [r.name, r.id]));

  const modifiers = [
    { name: "Cheese", price: 0.5 },
    { name: "Bacon", price: 1.0 },
    { name: "Avocado", price: 1.5 },
  ];
  for (const m of modifiers) {
    const ingId = ingMap[m.name] || null;
    await db.query(
      "INSERT INTO modifiers (name, price, group_id, ingredient_id) VALUES (?, ?, ?, ?)",
      [m.name, m.price, modGroupId, ingId],
    );
  }

  const [modRows] = await db.query("SELECT id, name FROM modifiers");
  const modMap = Object.fromEntries(modRows.map((r) => [r.name, r.id]));

  const itemMods = [
    { item: "Classic Burger", mods: ["Cheese", "Bacon", "Avocado"] },
    { item: "Veggie Burger", mods: ["Cheese", "Avocado"] },
  ];
  const [itemRows] = await db.query("SELECT id, name FROM menu_items");
  const itemMap = Object.fromEntries(itemRows.map((r) => [r.name, r.id]));

  for (const im of itemMods) {
    for (const mod of im.mods) {
      await db.query(
        "INSERT INTO item_modifiers (menu_item_id, modifier_id) VALUES (?, ?)",
        [itemMap[im.item], modMap[mod]],
      );
    }
  }

  console.log("Seed data inserted successfully.");
  await db.end();
}

main().catch((err) => {
  console.error("Error running seed script:", err);
});
