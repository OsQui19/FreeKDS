import React from 'react';
import PropTypes from 'prop-types';
import { TicketCard } from '../../../../packages/renderers/index.js';

/**
 * Render a collection of orders as kitchen tickets.
 *
 * @param {Object} props
 * @param {Array} props.orders - Array of order objects passed to TicketCard.
 * @param {string} [props.stationType] - Optional station type to customize TicketCard.
 */
function OrderList({ orders, stationType, onBump, onUrgent, urgentIds = new Set(), heldIds = new Set() }) {
  const aggregateItems = (items) => {
    const map = new Map();
    items.forEach((it) => {
      const key = `${it.name}|${(it.modifiers || []).join(',')}`;
      const prev = map.get(key);
      if (prev) prev.quantity += it.quantity;
      else map.set(key, { ...it });
    });
    return Array.from(map.values());
  };
  return (
    <>
      {orders.map((order) => (
        <div key={order.orderId} className={`ticket-wrap ${urgentIds.has(order.orderId) ? 'is-urgent' : ''}`}>
          {heldIds.has(order.orderId) && (
            <div className="badge bg-secondary mb-1">Held</div>
          )}
          {stationType === 'expo' && typeof onUrgent === 'function' && (
            <div className="d-flex justify-content-end mb-1">
              <button className="btn btn-sm btn-outline-warning" onClick={() => onUrgent(order.orderId)}>Mark Urgent</button>
            </div>
          )}
          <TicketCard stationType={stationType} {...order} onBump={onBump} items={stationType === 'expo' ? aggregateItems(order.items || []) : order.items} />
        </div>
      ))}
    </>
  );
}

OrderList.propTypes = {
  orders: PropTypes.arrayOf(TicketCard.propTypes).isRequired,
  stationType: PropTypes.string,
  onBump: PropTypes.func,
  onUrgent: PropTypes.func,
  urgentIds: PropTypes.instanceOf(Set),
  heldIds: PropTypes.instanceOf(Set),
};

export default OrderList;
