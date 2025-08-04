ALTER TABLE menu_items
  ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order,
  ADD COLUMN stock INT DEFAULT NULL AFTER is_available;
