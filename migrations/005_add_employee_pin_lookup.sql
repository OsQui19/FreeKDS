ALTER TABLE employees
  ADD COLUMN pin_lookup CHAR(8) DEFAULT NULL AFTER pin_hash,
  ADD INDEX idx_employees_pin_lookup (pin_lookup);
