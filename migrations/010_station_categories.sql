CREATE TABLE IF NOT EXISTS station_categories (
  station_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (station_id, category_id),
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

