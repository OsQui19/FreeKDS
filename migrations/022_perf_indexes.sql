-- Performance index: bump history by station (ORDER BY bumped_at DESC)
CREATE INDEX idx_bumped_orders_station_time ON bumped_orders (station_id, bumped_at);
