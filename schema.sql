SET FOREIGN_KEY_CHECKS=0;
CREATE DATABASE IF NOT EXISTS kds_db;
USE kds_db;

-- Stations table: each station has a type and optional order_type_filter (unchanged)
CREATE TABLE stations (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(20) NOT NULL,            -- e.g. 'expo' or 'prep'
  order_type_filter VARCHAR(20) DEFAULT NULL,      -- e.g. 'DINE-IN', 'TO-GO', etc. (null or 'ALL' means no filter)
  bg_color       VARCHAR(7) DEFAULT NULL,          -- optional station-specific background color
  primary_color  VARCHAR(7) DEFAULT NULL,          -- optional station-specific primary color
  font_family    VARCHAR(100) DEFAULT NULL
);

-- Categories table: groups menu items into categories (e.g., Wraps, Bowls, Drinks).
CREATE TABLE categories (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0                        -- display order of categories (lower numbers shown first)
);

-- Menu Items table: now includes category, price, image, and supports ordering within category.
CREATE TABLE menu_items (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  category_id INT NOT NULL,                       -- category grouping (foreign key to categories)
  station_id  INT NOT NULL,                       -- which station prepares this item (foreign key to stations)
  price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,-- price of the item
  image_url   VARCHAR(255) DEFAULT NULL,          -- URL of item image (if any)
  recipe      TEXT DEFAULT NULL,                  -- recipe/instructions for this item (prep notes)
  sort_order  INT DEFAULT 0,                      -- order of item within its category
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (station_id)  REFERENCES stations(id),
  UNIQUE KEY uniq_item_name_cat (category_id, name)  -- optional: ensure no duplicate item name per category
);

-- Modifiers table: defines optional add-ons or extras (e.g., sauces, proteins) that can be attached to menu items.
CREATE TABLE modifier_groups (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);
CREATE TABLE modifiers (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0.00,       -- extra charge for this modifier (0.00 if no extra cost)
  group_id   INT DEFAULT NULL,
  ingredient_id INT DEFAULT NULL,
  FOREIGN KEY (group_id) REFERENCES modifier_groups(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  , UNIQUE KEY uniq_modifier_name (name)
);

-- Linking table for menu items and their available modifiers.
CREATE TABLE item_modifiers (
  menu_item_id INT NOT NULL,
  modifier_id  INT NOT NULL,
  replaces_ingredient_id INT DEFAULT NULL,
  PRIMARY KEY (menu_item_id, modifier_id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (modifier_id)  REFERENCES modifiers(id) ON DELETE CASCADE,
  FOREIGN KEY (replaces_ingredient_id) REFERENCES ingredients(id)
);

-- Linking table assigning modifier groups to menu items
CREATE TABLE item_modifier_groups (
  menu_item_id INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (menu_item_id, group_id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

-- Orders table: one record per order (ticket).
CREATE TABLE orders (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50),             -- external reference or number (could be table number or online order ID)
  order_type   VARCHAR(20),             -- e.g. 'DINE-IN', 'TO-GO', 'CATERING'
  special_instructions TEXT,
  allergy      BOOLEAN DEFAULT FALSE,
  is_urgent    BOOLEAN DEFAULT FALSE,
  status       VARCHAR(10) DEFAULT 'active',  -- 'active' or 'completed'
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items table: line items for each order, linking to menu_items.
CREATE TABLE order_items (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  order_id      INT NOT NULL,
  menu_item_id  INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  special_instructions TEXT,
  allergy      BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (order_id)     REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  -- Note: If a menu_item is deleted, this FK (without ON DELETE CASCADE) will prevent deletion if referenced by orders.
);
-- Chosen modifiers for each order item (customisations)
CREATE TABLE order_item_modifiers (
  order_item_id INT NOT NULL,
  modifier_id   INT NOT NULL,
  PRIMARY KEY (order_item_id, modifier_id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (modifier_id)   REFERENCES modifiers(id) ON DELETE CASCADE
);
-- Settings table: key-value store for configuration
-- (brand name, theme colors, employee data, etc.)
CREATE TABLE settings (
  setting_key   VARCHAR(50) PRIMARY KEY,
  setting_value TEXT
);
CREATE TABLE bumped_orders (
  order_id INT NOT NULL,
  station_id INT NOT NULL,
  order_number VARCHAR(50),
  bumped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, station_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id)
);
-- Measurement units table
CREATE TABLE units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL,
  to_base DECIMAL(10,4) NOT NULL DEFAULT 1
);

-- Item categories for ingredients
CREATE TABLE item_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  parent_id INT DEFAULT NULL,
  FOREIGN KEY (parent_id) REFERENCES item_categories(id)
);

-- Seed common units
INSERT INTO units (name, abbreviation, type, to_base) VALUES
  ('pounds', 'lb', 'weight', 453.592),
  ('ounces', 'oz', 'weight', 28.3495),
  ('grams', 'g', 'weight', 1),
  ('kilograms', 'kg', 'weight', 1000),
  ('liters', 'l', 'volume', 1000),
  ('milliliters', 'ml', 'volume', 1),
  ('fluid ounces', 'fl oz', 'volume', 29.5735),
  ('gallons', 'gal', 'volume', 3785.41),
  ('each', 'ea', 'count', 1);

-- Ingredients table for inventory tracking
CREATE TABLE ingredients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_id INT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  sku VARCHAR(50) DEFAULT NULL,
  cost DECIMAL(10,2) DEFAULT 0.00,
  is_public BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (category_id) REFERENCES item_categories(id),
  UNIQUE KEY uniq_ingredient_name (name)
);

CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE ingredient_tags (
  ingredient_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (ingredient_id, tag_id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Per-item ingredients
CREATE TABLE item_ingredients (
  menu_item_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_id INT DEFAULT NULL,
  PRIMARY KEY (menu_item_id, ingredient_id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Log of inventory deductions per order
CREATE TABLE inventory_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE inventory_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ingredient_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);
CREATE TABLE daily_usage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  ingredient_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  , UNIQUE KEY uniq_day_ing (start_date, ingredient_id)
);

-- Suppliers for purchasing
CREATE TABLE suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  contact_info VARCHAR(255) DEFAULT NULL
);

-- Inventory locations for multi-store tracking
CREATE TABLE inventory_locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

-- Purchase orders
CREATE TABLE purchase_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT NOT NULL,
  location_id INT DEFAULT NULL,
  order_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (location_id) REFERENCES inventory_locations(id)
);

CREATE TABLE purchase_order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_order_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_id INT DEFAULT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(50) DEFAULT NULL,
  last_name VARCHAR(50) DEFAULT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  pin_hash VARCHAR(255) DEFAULT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'FOH',
  position VARCHAR(100) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  wage_rate DECIMAL(10,2) DEFAULT NULL
);

CREATE TABLE time_clock (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  clock_in DATETIME NOT NULL,
  clock_out DATETIME DEFAULT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE employee_schedule (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  week_key VARCHAR(10) NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
CREATE INDEX idx_employee_schedule_week ON employee_schedule(week_key);

CREATE TABLE security_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) DEFAULT NULL,
  ip_address VARCHAR(45) NOT NULL,
  event VARCHAR(20) NOT NULL,
  path VARCHAR(255) DEFAULT NULL,
  success BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_log_created_at ON security_log(created_at);

-- Performance indexes
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_inventory_log_created_at ON inventory_log(created_at);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
SET FOREIGN_KEY_CHECKS=1;
