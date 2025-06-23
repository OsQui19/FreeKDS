const express = require('express');
const { updateItemModifiers, updateItemGroups, getMenuData, getStations, getIngredients, getUnits, updateItemIngredients, getSalesTotals, getIngredientUsage, getSuppliers, getLocations, getPurchaseOrders, getPurchaseOrderItems, receivePurchaseOrder } = require('../controllers/dbHelpers');
const settingsCache = require('../controllers/settingsCache');

module.exports = (db, io) => {
  const router = express.Router();
  router.get('/admin', async (req, res) => {
    try {
      const { categories, stations: menuStations, mods, modGroups, ingredients: publicIngredients, units } = await getMenuData(db);
      const stationRows = await getStations(db);
      const allIngredients = await getIngredients(db);
      const unitRows = await getUnits(db);
      const [logRows] = await db.promise().query(`SELECT l.*, mi.name AS item_name, ing.name AS ingredient_name, u.abbreviation AS unit
                                                FROM inventory_log l
                                                JOIN menu_items mi ON l.menu_item_id = mi.id
                                                JOIN ingredients ing ON l.ingredient_id = ing.id
                                                LEFT JOIN units u ON ing.unit_id = u.id
                                                ORDER BY l.id DESC LIMIT 100`);
      const [transactions] = await db.promise().query(`SELECT t.*, ing.name AS ingredient_name, u.abbreviation AS unit
                                                      FROM inventory_transactions t
                                                      JOIN ingredients ing ON t.ingredient_id = ing.id
                                                      LEFT JOIN units u ON ing.unit_id = u.id
                                                      ORDER BY t.id DESC LIMIT 100`);
      const summarySql = `SELECT ing.id AS ingredient_id, ing.name, u.abbreviation AS unit, SUM(d.amount) AS total
                          FROM daily_usage_log d
                          JOIN ingredients ing ON d.ingredient_id = ing.id
                          LEFT JOIN units u ON ing.unit_id = u.id
                          GROUP BY ing.id
                          ORDER BY ing.name`;
      const [summary] = await db.promise().query(summarySql);

      const settings = res.locals.settings || {};
      res.render('admin/home', {
        stations: stationRows,
        categories,
        stationsMenu: menuStations,
        mods,
        modGroups,
        ingredients: allIngredients,
        publicIngredients,
        logs: logRows,
        summary,
        transactions,
        units: unitRows,
        settings
      });
    } catch (err) {
      console.error('Error fetching admin page data:', err);
      res.status(500).send('DB Error');
    }
  });
  router.get('/admin/menu', async (req, res) => {
    try {
      const { categories, stations, mods, modGroups, ingredients: publicIngredients, units } = await getMenuData(db);
      res.render('admin/menu', { categories, stations, mods, modGroups, publicIngredients, units });
    } catch (err) {
      console.error('Error fetching menu data:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/items', async (req, res) => {
  const id         = req.body.id;
  const name       = req.body.name;
  const price      = parseFloat(req.body.price) || 0;
  const stationId  = req.body.station_id;
  const categoryId = req.body.category_id;
  const recipe     = req.body.recipe ? req.body.recipe.trim() : '';
  const imageUrl   = req.body.image_url && req.body.image_url.trim() !== '' ? req.body.image_url.trim() : null;
  let itemIngredients = [];
  if (req.body.ingredient_ids && req.body.ingredient_amounts) {
    const ids = Array.isArray(req.body.ingredient_ids) ? req.body.ingredient_ids : [req.body.ingredient_ids];
    const amts = Array.isArray(req.body.ingredient_amounts) ? req.body.ingredient_amounts : [req.body.ingredient_amounts];
    const unitIds = req.body.ingredient_unit_ids ? (Array.isArray(req.body.ingredient_unit_ids) ? req.body.ingredient_unit_ids : [req.body.ingredient_unit_ids]) : [];
    itemIngredients = ids.map((id, idx) => ({
      ingredient_id: parseInt(id,10),
      amount: parseFloat(amts[idx] || 0),
      unit_id: unitIds[idx] ? parseInt(unitIds[idx],10) : null
    })).filter(r => r.ingredient_id && r.amount);
  }

  // Parse selected modifier groups
  const rawGroups = req.body.group_ids;
  const groupIds = Array.isArray(rawGroups) ? rawGroups : rawGroups ? [rawGroups] : [];
  const selectedGroups = groupIds.map(g => parseInt(g, 10)).filter(g => !isNaN(g));
  if (itemIngredients.length) {
    try {
      const [rows] = await db.promise().query('SELECT id FROM units');
      const valid = new Set(rows.map(r => r.id));
      for (const ing of itemIngredients) {
        if (!valid.has(ing.unit_id)) {
          return res.status(400).send('Invalid unit selection');
        }
      }
    } catch (err) {
      console.error('Error verifying ingredient units:', err);
      return res.status(500).send('DB Error');
    }
  }

  // Parse and validate selected modifiers
  let selectedMods = [];
  const rawMods = req.body.modifier_ids;
  const rawReps = req.body.replaces_ingredient_ids;
  const modIds = Array.isArray(rawMods) ? rawMods : rawMods ? [rawMods] : [];
  const repIds = Array.isArray(rawReps) ? rawReps : rawReps ? [rawReps] : [];
  selectedMods = modIds.map((m, idx) => ({
    modifier_id: parseInt(m, 10),
    replaces_ingredient_id: repIds[idx] ? parseInt(repIds[idx], 10) || null : null
  })).filter(r => r.modifier_id);

  if (selectedMods.length) {
    try {
      const [modRows] = await db.promise().query(
        'SELECT id, ingredient_id FROM modifiers WHERE id IN (?)',
        [selectedMods.map(r => r.modifier_id)]
      );
      if (modRows.length !== selectedMods.length || modRows.some(r => !r.ingredient_id)) {
        return res.redirect('/admin?tab=menu&msg=Invalid+modifier+selection');
      }
    } catch (err) {
      console.error('Error verifying modifiers:', err);
      return res.status(500).send('DB Error');
    }
  }

  if (!name || !stationId || !categoryId) {
    return res.redirect('/admin?tab=menu');
  }
  if (!id && itemIngredients.length === 0) {
    if (recipe === '') {
      return res.redirect('/admin?tab=menu&msg=Ingredients+or+recipe+required');
    }
    return res.redirect('/admin?tab=menu&msg=Ingredients+required');
  }
  if (id) {
    const updateSql = `UPDATE menu_items
                       SET name=?, price=?, station_id=?, category_id=?, image_url=?, recipe=?
                       WHERE id=?`;
    db.query(updateSql, [name, price, stationId, categoryId, imageUrl, recipe, id], (err) => {
      if (err) { console.error(err); }
      updateItemGroups(db, id, selectedGroups, () => {
        updateItemModifiers(db, id, selectedMods, () => {
          if (itemIngredients.length) {
            updateItemIngredients(db, id, itemIngredients, () => {
              return res.redirect('/admin?tab=menu&msg=Item+saved');
            });
          } else {
            return res.redirect('/admin?tab=menu&msg=Item+saved');
          }
        });
      });
    });
  } else {
    const sortSql = 'SELECT IFNULL(MAX(sort_order), -1) AS maxOrder FROM menu_items WHERE category_id=?';
    db.query(sortSql, [categoryId], (err, results) => {
      if (err) { console.error(err); results = [{ maxOrder: -1 }]; }
      const nextOrder = (results[0].maxOrder || 0) + 1;
      const insertSql = `INSERT INTO menu_items (name, price, station_id, category_id, image_url, recipe, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.query(insertSql, [name, price, stationId, categoryId, imageUrl, recipe, nextOrder], (err, result) => {
          if (err) { console.error(err); return res.redirect('/admin?tab=menu'); }
        const newItemId = result.insertId;
        updateItemGroups(db, newItemId, selectedGroups, () => {
          updateItemModifiers(db, newItemId, selectedMods, () => {
            updateItemIngredients(db, newItemId, itemIngredients, () => {
              return res.redirect('/admin?tab=menu&msg=Item+saved');
            });
          });
        });
      });
    });
  }
});


  router.post('/admin/items/delete', (req, res) => {
  const itemId = req.body.id;
  if (!itemId) return res.redirect('/admin?tab=menu');
  db.query('DELETE FROM menu_items WHERE id=?', [itemId], (err) => {
    if (err) {
      console.error('Error deleting item:', err);
    }
    return res.redirect('/admin?tab=menu&msg=Item+deleted');
  });
});

  router.post('/admin/categories', (req, res) => {
  const id   = req.body.id;
  const name = req.body.name;
  if (!name) return res.redirect('/admin?tab=menu');
  if (id) {
    db.query('UPDATE categories SET name=? WHERE id=?', [name, id], (err) => {
      if (err) { console.error(err); }
      return res.redirect('/admin?tab=menu&msg=Category+saved');
    });
  } else {
    const sortSql = 'SELECT IFNULL(MAX(sort_order), -1) AS maxOrder FROM categories';
    db.query(sortSql, (err, results) => {
      if (err) { console.error(err); results = [{ maxOrder: -1 }]; }
      const nextOrder = (results[0].maxOrder || 0) + 1;
      db.query('INSERT INTO categories (name, sort_order) VALUES (?, ?)', [name, nextOrder], (err2) => {
        if (err2) { console.error(err2); }
        return res.redirect('/admin?tab=menu&msg=Category+saved');
      });
    });
  }
});

  router.post('/admin/categories/delete', (req, res) => {
  const categoryId = req.body.id;
  if (!categoryId) return res.redirect('/admin?tab=menu');
  db.query('SELECT COUNT(*) AS count FROM menu_items WHERE category_id=?', [categoryId], (err, results) => {
    if (err) { console.error(err); return res.redirect('/admin?tab=menu'); }
    if (results[0].count > 0) {
      console.error('Cannot delete category with existing items.');
      return res.redirect('/admin?tab=menu');
    }
    db.query('DELETE FROM categories WHERE id=?', [categoryId], (err2) => {
      if (err2) { console.error('Error deleting category:', err2); }
      return res.redirect('/admin?tab=menu&msg=Category+deleted');
    });
  });
});

  router.post('/admin/categories/reorder', (req, res) => {
  const newOrder = req.body.order;
  if (!Array.isArray(newOrder)) return res.sendStatus(400);
  newOrder.forEach((catId, index) => {
    db.query('UPDATE categories SET sort_order=? WHERE id=?', [index, catId], (err) => {
      if (err) console.error('Error updating category order:', err);
    });
  });
  return res.sendStatus(200);
});

  router.post('/admin/items/reorder', (req, res) => {
  const categoryId = req.body.categoryId;
  const newOrder   = req.body.order;
  if (!categoryId || !Array.isArray(newOrder)) return res.sendStatus(400);
  newOrder.forEach((itemId, index) => {
    db.query('UPDATE menu_items SET sort_order=?, category_id=? WHERE id=?', [index, categoryId, itemId], (err) => {
      if (err) console.error('Error updating item order:', err);
    });
  });
  return res.sendStatus(200);
});
  router.post('/admin/ingredients', (req, res) => {
  const id = req.body.id;
  const name = req.body.name;
  const unitIdRaw = req.body.unit_id;
  const unit = unitIdRaw ? parseInt(unitIdRaw, 10) : null;
  const sku = req.body.sku || null;
  let cost = parseFloat(req.body.cost);
  if (isNaN(cost)) cost = 0;  let qty = parseFloat(req.body.quantity);
  if (isNaN(qty)) qty = 0;
  const isPublic = req.body.is_public ? 1 : 0;
  if (!name) return res.redirect('/admin?tab=inventory');
  if (id) {
    db.query('UPDATE ingredients SET name=?, quantity=?, unit_id=?, sku=?, cost=?, is_public=? WHERE id=?', [name, qty, unit, sku, cost, isPublic, id], err => {
      if (err) console.error('Error updating ingredient:', err);
      res.redirect('/admin?tab=inventory&msg=Ingredient+saved');
    });
  } else {
      db.query('INSERT INTO ingredients (name, quantity, unit_id, sku, cost, is_public) VALUES (?, ?, ?, ?, ?, ?)', [name, qty, unit, sku, cost, isPublic], err => {
      if (err) console.error('Error inserting ingredient:', err);
      res.redirect('/admin?tab=inventory&msg=Ingredient+saved');
    });
  }
});

    router.post('/admin/ingredients/delete', (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect('/admin?tab=inventory');
    db.query('DELETE FROM ingredients WHERE id=?', [id], err => {
      if (err) console.error('Error deleting ingredient:', err);
      res.redirect('/admin?tab=inventory&msg=Ingredient+deleted');
    });
  });
  router.post('/admin/inventory/transactions', (req, res) => {
    const ingredientId = req.body.ingredient_id;
    const type = req.body.type || 'adjust';
    let qty = parseFloat(req.body.quantity);
    if (!ingredientId || isNaN(qty)) return res.redirect('/admin?tab=inventory');
    db.query('INSERT INTO inventory_transactions (ingredient_id, type, quantity) VALUES (?, ?, ?)',
      [ingredientId, type, qty], err => {
        if (err) console.error('Error inserting transaction:', err);
    });
    db.query('UPDATE ingredients SET quantity = quantity + ? WHERE id=?', [qty, ingredientId], err2 => {
      if (err2) console.error('Error updating quantity:', err2);
      res.redirect('/admin?tab=inventory&msg=Transaction+recorded');
    });
  });

  router.get('/admin/inventory/stats', async (req, res) => {
    try {
      const { start, end } = req.query;
      const sales = await getSalesTotals(db, start, end);
      const usage = await getIngredientUsage(db, start, end);
      res.json({ sales, usage });
    } catch (err) {
      console.error('Error fetching inventory stats:', err);
      res.status(500).json({ error: 'DB Error' });
    }
  });

  router.get('/admin/inventory/logs', async (req, res) => {
    try {
      const { start, end } = req.query;
      const endDate = end ? new Date(end) : new Date();
      const startDate = start ? new Date(start) : new Date(endDate.getTime() - 86400000);
      function fmt(d) { return d.toISOString().slice(0,19).replace('T',' '); }
      const sql = `SELECT l.*, mi.name AS item_name, ing.name AS ingredient_name, u.abbreviation AS unit
                   FROM inventory_log l
                   JOIN menu_items mi ON l.menu_item_id = mi.id
                   JOIN ingredients ing ON l.ingredient_id = ing.id
                   LEFT JOIN units u ON ing.unit_id = u.id
                   WHERE l.created_at BETWEEN ? AND ?
                   ORDER BY l.id DESC`;
      const [logs] = await db.promise().query(sql, [fmt(startDate), fmt(endDate)]);
      res.json({ logs });
    } catch (err) {
      console.error('Error fetching inventory logs:', err);
      res.status(500).json({ error: 'DB Error' });
    }
  });

  router.post('/admin/inventory/logs', async (req, res) => {
    try {
      const { start, end } = req.body;
      if (!start || !end) return res.redirect('/admin?tab=inventory');
      const [rows] = await db.promise().query(
        `SELECT ingredient_id, SUM(amount) AS total
           FROM inventory_log
          WHERE created_at BETWEEN ? AND ?
          GROUP BY ingredient_id`,
        [start + ' 00:00:00', end + ' 23:59:59']
      );
      for (const r of rows) {
        await db.promise().query(
          'INSERT INTO daily_usage_log (start_date, end_date, ingredient_id, amount) VALUES (?, ?, ?, ?)',
          [start, end, r.ingredient_id, r.total]
        );
      }
      res.redirect('/admin?tab=inventory&msg=Usage+log+created');
    } catch (err) {
      console.error('Error creating usage log:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/modifiers', (req, res) => {
  const id   = req.body.id;
  const name = req.body.name;
  let price  = parseFloat(req.body.price);
  const groupId = req.body.group_id || null;
  const ingredientId = parseInt(req.body.ingredient_id, 10);
  if (isNaN(price)) price = 0.0;
  if (!name || !ingredientId) return res.redirect('/admin?tab=menu&openMods=1');

  db.query('SELECT id, name FROM ingredients WHERE id=? LIMIT 1', [ingredientId], (err, rows) => {
    if (err || rows.length === 0) {
      console.error('Invalid ingredient for modifier');
      return res.redirect('/admin?tab=menu&openMods=1');
    }
    const ingName = rows[0].name;
    const modName = name.trim() || ingName;
    const params = [modName, price, groupId, ingredientId];
    if (id) {
      db.query('UPDATE modifiers SET name=?, price=?, group_id=?, ingredient_id=? WHERE id=?', [...params, id], (err2) => {
        if (err2) { console.error(err2); }
        return res.redirect('/admin?tab=menu&msg=Modifier+saved&openMods=1');
      });
    } else {
      db.query('INSERT INTO modifiers (name, price, group_id, ingredient_id) VALUES (?, ?, ?, ?)', params, (err2) => {
        if (err2) { console.error(err2); }
        return res.redirect('/admin?tab=menu&msg=Modifier+saved&openMods=1');
      });
    }
  });
});

  router.post('/admin/modifiers/delete', (req, res) => {
  const modId = req.body.id;
  if (!modId) return res.redirect('/admin?tab=menu&openMods=1');
  db.query('DELETE FROM modifiers WHERE id=?', [modId], (err) => {
    if (err) { console.error('Error deleting modifier:', err); }
    return res.redirect('/admin?tab=menu&msg=Modifier+deleted&openMods=1');
  });
});

  router.post('/admin/modifier-groups', (req, res) => {
  const id = req.body.id;
  const name = req.body.name;
  if (!name) return res.redirect('/admin?tab=menu');
  if (id) {
    db.query('UPDATE modifier_groups SET name=? WHERE id=?', [name, id], err => {
      if (err) { console.error(err); }
      res.redirect('/admin?tab=menu&msg=Group+saved');
    });
  } else {
    db.query('INSERT INTO modifier_groups (name) VALUES (?)', [name], err => {
      if (err) { console.error(err); }
      res.redirect('/admin?tab=menu&msg=Group+saved');
    });
  }
});

  router.post('/admin/modifier-groups/delete', (req, res) => {
  const id = req.body.id;
  if (!id) return res.redirect('/admin?tab=menu');
  db.query('DELETE FROM modifier_groups WHERE id=?', [id], err => {
    if (err) { console.error('Error deleting modifier group:', err); }
    res.redirect('/admin?tab=menu&msg=Group+deleted');
  });
});

  router.get('/admin/stations', async (req, res) => {
  try {
    const rows = await getStations(db);
    res.render('admin/stations', { stations: rows });
  } catch (err) {
      console.error('Error fetching stations:', err);
      res.status(500).send('DB Error');
  }
});

  router.post('/admin/stations', (req, res) => {
  const name  = req.body.name;
  const type  = req.body.type;
  let filter  = req.body.order_type_filter;
  const bg    = req.body.bg_color || null;
  const primary = req.body.primary_color || null;
  const font  = req.body.font_family || null;
  if (filter === '') filter = null;
  const insert = () => {
    db.query('INSERT INTO stations (name, type, order_type_filter, bg_color, primary_color, font_family) VALUES (?, ?, ?, ?, ?, ?)', [name, type, filter, bg, primary, font], err => {
      if (err) console.error('Error inserting station:', err);
      res.redirect('/admin?tab=stations&msg=Station+saved');
    });
  };

  insert();
});

  router.post('/admin/stations/update', (req, res) => {
  const id    = req.body.id;
  const name  = req.body.name;
  const type  = req.body.type;
  let filter  = req.body.order_type_filter;
  const bg    = req.body.bg_color || null;
  const primary = req.body.primary_color || null;
  const font  = req.body.font_family || null;
  if (!id) return res.redirect('/admin?tab=stations');
  if (filter === '') filter = null;

  const update = () => {
    db.query('UPDATE stations SET name=?, type=?, order_type_filter=?, bg_color=?, primary_color=?, font_family=? WHERE id=?', [name, type, filter, bg, primary, font, id], err => {
      if (err) console.error('Error updating station:', err);
      res.redirect('/admin?tab=stations&msg=Station+saved');
    });
  };

  update();
});

  router.post('/admin/stations/delete', (req, res) => {
  const id = req.body.id;
  if (!id) return res.redirect('/admin?tab=stations');
  db.query('DELETE FROM stations WHERE id=?', [id], err => {
    if (err) console.error('Error deleting station:', err);
    res.redirect('/admin?tab=stations&msg=Station+deleted');
  });
});
  router.get('/admin/inventory', async (req, res) => {
    try {
      const ingredients = await getIngredients(db);
      const unitRows = await getUnits(db);
      const logSql = `SELECT l.*, mi.name AS item_name, ing.name AS ingredient_name, u.abbreviation AS unit
                      FROM inventory_log l
                      JOIN menu_items mi ON l.menu_item_id = mi.id
                      JOIN ingredients ing ON l.ingredient_id = ing.id
                      LEFT JOIN units u ON ing.unit_id = u.id
                      ORDER BY l.id DESC LIMIT 100`;
      const [logs] = await db.promise().query(logSql);
      const [transactions] = await db.promise().query(`SELECT t.*, ing.name AS ingredient_name, u.abbreviation AS unit
                                                      FROM inventory_transactions t
                                                      JOIN ingredients ing ON t.ingredient_id = ing.id
                                                      LEFT JOIN units u ON ing.unit_id = u.id
                                                      ORDER BY t.id DESC LIMIT 100`);
      const summarySql = `SELECT ing.id AS ingredient_id, ing.name, u.abbreviation AS unit, SUM(d.amount) AS total
                          FROM daily_usage_log d
                          JOIN ingredients ing ON d.ingredient_id = ing.id
                          LEFT JOIN units u ON ing.unit_id = u.id
                          GROUP BY ing.id
                          ORDER BY ing.name`;
      const [summary] = await db.promise().query(summarySql);

      res.render('admin/inventory', { ingredients, logs, summary, transactions, units: unitRows });    } catch (err) {
      console.error('Error fetching inventory:', err);
      res.status(500).send('DB Error');
    }
  });
  router.get('/admin/theme', (req, res) => {
  db.query('SELECT * FROM settings', (err, rows) => {
    if (err) {
      console.error('Error fetching settings:', err);
      return res.status(500).send('DB Error');
    }
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.render('admin/themes', { settings });
  });
});

  router.post('/admin/settings', (req, res) => {
  const allowed = ['brand_name','theme_primary_color','theme_bg_color','ticket_layout','font_family','custom_css'];
  const settings = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) settings[k] = req.body[k]; });
  const keys = Object.keys(settings);
  if (keys.length === 0) return res.redirect('/admin?tab=theme');

  let remaining = keys.length;
  keys.forEach(key => {
    const value = settings[key];
    const sql = 'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)';
    db.query(sql, [key, value], err => {
      if (err) console.error('Error saving setting:', err);
      if (--remaining === 0) {
        settingsCache.loadSettings(db);
        res.redirect('/admin?tab=theme&msg=Settings+saved');
      }
    });
  });
});

  // Suppliers
  router.get('/admin/suppliers', async (req, res) => {
    try {
      const suppliers = await getSuppliers(db);
      res.render('admin/suppliers', { suppliers });
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/suppliers', (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const contact = req.body.contact_info || null;
    if (!name) return res.redirect('/admin/suppliers');
    if (id) {
      db.query('UPDATE suppliers SET name=?, contact_info=? WHERE id=?', [name, contact, id], err => {
        if (err) console.error('Error updating supplier:', err);
        res.redirect('/admin/suppliers?msg=Supplier+saved');
      });
    } else {
      db.query('INSERT INTO suppliers (name, contact_info) VALUES (?, ?)', [name, contact], err => {
        if (err) console.error('Error inserting supplier:', err);
        res.redirect('/admin/suppliers?msg=Supplier+saved');
      });
    }
  });

  router.post('/admin/suppliers/delete', (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect('/admin/suppliers');
    db.query('DELETE FROM suppliers WHERE id=?', [id], err => {
      if (err) console.error('Error deleting supplier:', err);
      res.redirect('/admin/suppliers?msg=Supplier+deleted');
    });
  });

  // Inventory locations
  router.get('/admin/locations', async (req, res) => {
    try {
      const locations = await getLocations(db);
      res.render('admin/locations', { locations });
    } catch (err) {
      console.error('Error fetching locations:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/locations', (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    if (!name) return res.redirect('/admin/locations');
    if (id) {
      db.query('UPDATE inventory_locations SET name=? WHERE id=?', [name, id], err => {
        if (err) console.error('Error updating location:', err);
        res.redirect('/admin/locations?msg=Location+saved');
      });
    } else {
      db.query('INSERT INTO inventory_locations (name) VALUES (?)', [name], err => {
        if (err) console.error('Error inserting location:', err);
        res.redirect('/admin/locations?msg=Location+saved');
      });
    }
  });

  router.post('/admin/locations/delete', (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect('/admin/locations');
    db.query('DELETE FROM inventory_locations WHERE id=?', [id], err => {
      if (err) console.error('Error deleting location:', err);
      res.redirect('/admin/locations?msg=Location+deleted');
    });
  });

  // Purchase orders
  router.get('/admin/purchase-orders', async (req, res) => {
    try {
      const orders = await getPurchaseOrders(db);
      const suppliers = await getSuppliers(db);
      const locations = await getLocations(db);
      res.render('admin/purchase_orders', { orders, suppliers, locations });
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/purchase-orders', (req, res) => {
    const supplier = req.body.supplier_id;
    const location = req.body.location_id || null;
    const date = req.body.order_date || new Date().toISOString().slice(0,10);
    if (!supplier) return res.redirect('/admin/purchase-orders');
    db.query('INSERT INTO purchase_orders (supplier_id, location_id, order_date) VALUES (?, ?, ?)', [supplier, location, date], err => {
      if (err) console.error('Error inserting purchase order:', err);
      res.redirect('/admin/purchase-orders?msg=Order+created');
    });
  });

  router.get('/admin/purchase-orders/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const orders = await db.promise().query(`SELECT po.*, s.name AS supplier_name, l.name AS location_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id LEFT JOIN inventory_locations l ON po.location_id=l.id WHERE po.id=?`, [id]);
      if (!orders[0].length) return res.redirect('/admin/purchase-orders');
      const order = orders[0][0];
      const items = await getPurchaseOrderItems(db, id);
      const ingredients = await getIngredients(db);
      const units = await getUnits(db);
      res.render('admin/purchase_order_detail', { order, items, ingredients, units });
    } catch (err) {
      console.error('Error fetching order detail:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/purchase-orders/:id/receive', async (req, res) => {
    const id = req.params.id;
    try {
      await receivePurchaseOrder(db, id);
      res.redirect(`/admin/purchase-orders/${id}?msg=Order+received`);
    } catch (err) {
      console.error('Error receiving order:', err);
      res.status(500).send('DB Error');
    }
  });

  router.post('/admin/purchase-orders/delete', (req, res) => {
    const id = req.body.id;
    if (!id) return res.redirect('/admin/purchase-orders');
    db.query('DELETE FROM purchase_orders WHERE id=?', [id], err => {
      if (err) console.error('Error deleting order:', err);
      res.redirect('/admin/purchase-orders?msg=Order+deleted');
    });
  });

  router.post('/admin/purchase-order-items', (req, res) => {
    const orderId = req.body.purchase_order_id;
    const ingredient = req.body.ingredient_id;
    const qty = parseFloat(req.body.quantity);
    const unitId = req.body.unit_id || null;
    if (!orderId || !ingredient || isNaN(qty)) return res.redirect('/admin/purchase-orders');
    db.query('INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_id) VALUES (?, ?, ?, ?)', [orderId, ingredient, qty, unitId], err => {
      if (err) console.error('Error inserting PO item:', err);
      res.redirect(`/admin/purchase-orders/${orderId}`);
    });
  });

  router.post('/admin/purchase-order-items/delete', (req, res) => {
    const id = req.body.id;
    const orderId = req.body.order_id;
    if (!id) return res.redirect('/admin/purchase-orders');
    db.query('DELETE FROM purchase_order_items WHERE id=?', [id], err => {
      if (err) console.error('Error deleting PO item:', err);
      res.redirect(`/admin/purchase-orders/${orderId}`);
    });
  });

  return router;
};
