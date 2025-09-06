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
function OrderList({ orders, stationType, onBump, onUrgent, urgentIds = new Set(), heldIds = new Set(), newIds = new Set(), onItemToggle }) {
  const prioritize = (orderId) => {
    try {
      // naive: try to send via global transport socket if exposed by app; otherwise no-op
      if (window && window.__kdsSend) {
        window.__kdsSend('prioritizeOrder', { orderId, amount: 1 });
      }
    } catch {}
  };
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
        <div key={order.orderId} className={`ticket-wrap ${urgentIds.has(order.orderId) ? 'is-urgent' : ''} ${newIds.has(order.orderId) ? 'is-new' : ''}`} data-order-id={order.orderId}>
          {heldIds.has(order.orderId) && (
            <div className="badge bg-secondary mb-1">Held</div>
          )}
          <div className="d-flex justify-content-end mb-1 gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => prioritize(order.orderId)} title="Move to top">▲</button>
          {stationType === 'expo' && typeof onUrgent === 'function' && (
            <div className="d-flex justify-content-end mb-1">
              <button className="btn btn-sm btn-outline-warning" onClick={() => onUrgent(order.orderId)}>Rush this order</button>
            </div>
          )}
          </div>
          <TicketCard stationType={stationType} {...order} onBump={onBump} bumpLabel={stationType === 'expo' ? 'Clear' : 'Send'} onItemToggle={onItemToggle} items={stationType === 'expo' ? aggregateItems(order.items || []) : order.items} />
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
  newIds: PropTypes.instanceOf(Set),
  onItemToggle: PropTypes.func,
  heldIds: PropTypes.instanceOf(Set),
};

export default OrderList;
