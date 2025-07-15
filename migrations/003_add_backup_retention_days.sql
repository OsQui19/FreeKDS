INSERT INTO settings (setting_key, setting_value)
  VALUES ('backup_retention_days', '30')
  ON DUPLICATE KEY UPDATE setting_value = setting_value;
