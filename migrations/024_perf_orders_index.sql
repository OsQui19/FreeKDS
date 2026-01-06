-- Performance index: active queue sorting/filtering
CREATE INDEX idx_orders_status_priority_created ON orders (status, priority, created_at);

