import React from 'react';
import PropTypes from 'prop-types';

/**
 * Render a single kitchen ticket.
 *
 * @param {Object} props
 * @param {number|string} props.orderId - Unique identifier for the order.
 * @param {string|number} props.orderNumber - Human readable ticket number.
 * @param {string} [props.orderType] - Optional type such as "DINE-IN" or "TO-GO".
 * @param {number} props.createdTs - Unix timestamp when the order was created.
 * @param {boolean} [props.allergy] - Whether the ticket is marked as an allergy.
 * @param {string} [props.specialInstructions] - Extra instructions for the whole ticket.
 * @param {Array} props.items - Line items to display on the ticket.
 * @param {string} [props.stationType] - Station type to influence item styling.
 */
function TicketCard({
  orderId,
  orderNumber,
  orderType,
  createdTs,
  allergy,
  specialInstructions,
  items,
  stationType,
}) {
  const date = new Date(createdTs * 1000);
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
  return (
    <div
      className={`ticket ${orderType ? orderType.replace(/\s+/g, '-').toLowerCase() : ''}`}
      data-order-id={orderId}
      data-created-ts={createdTs}
    >
      <div className="ticket-header">
        {orderType && (
          <span className={`order-type ${orderType.replace(/\s+/g, '-').toLowerCase()}`}>{orderType}</span>
        )}
        <span className="order-num">{orderNumber}</span>
        {allergy && <span className="allergy-label">ALLERGY</span>}
        <span className="order-time">{timeStr}</span>
        <span className="elapsed">00:00</span>
      </div>
      {specialInstructions && (
        <div className={`ticket-instructions${allergy ? ' allergy' : ''}`}>{specialInstructions}</div>
      )}
      <ul className={`items${stationType === 'expo' ? ' expo-items' : ''}`}>
        {items.map((item, idx) => (
          <li key={idx} className={`item ${item.stationId ? 'station-' + item.stationId : ''}`}>
            <span className="qty">{item.quantity}×</span>
            <span
              className="item-name"
              data-item-id={item.itemId}
              {...(item.stationId ? { 'data-station-id': item.stationId } : {})}
            >
              {item.name}
            </span>
            {item.modifiers && item.modifiers.length > 0 && (
              <ul className="item-modifiers">
                {item.modifiers.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
            {item.specialInstructions && (
              <div className={`ticket-instructions${item.allergy ? ' allergy' : ''}`}>
                {item.specialInstructions}
              </div>
            )}
            {item.allergy && <div className="allergy-label">ALLERGY</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

TicketCard.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  orderNumber: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  orderType: PropTypes.string,
  createdTs: PropTypes.number.isRequired,
  allergy: PropTypes.bool,
  specialInstructions: PropTypes.string,
  stationType: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      itemId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      stationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      modifiers: PropTypes.arrayOf(PropTypes.string),
      specialInstructions: PropTypes.string,
      allergy: PropTypes.bool,
    })
  ).isRequired,
};

export default TicketCard;
