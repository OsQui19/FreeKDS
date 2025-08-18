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
function OrderList({ orders, stationType }) {
  return (
    <>
      {orders.map((order) => (
        <TicketCard key={order.orderId} stationType={stationType} {...order} />
      ))}
    </>
  );
}

OrderList.propTypes = {
  orders: PropTypes.arrayOf(TicketCard.propTypes).isRequired,
  stationType: PropTypes.string,
};

export default OrderList;
