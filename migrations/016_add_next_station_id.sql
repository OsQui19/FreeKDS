ALTER TABLE stations
  ADD COLUMN next_station_id INT DEFAULT NULL AFTER font_family,
  ADD CONSTRAINT fk_stations_next_station FOREIGN KEY (next_station_id) REFERENCES stations(id);

