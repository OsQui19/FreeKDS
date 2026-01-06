-- Performance index: readiness checks per order
CREATE INDEX idx_order_items_order_state ON order_items (order_id, state);

