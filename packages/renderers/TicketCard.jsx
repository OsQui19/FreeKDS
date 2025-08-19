import React from 'react';
import PropTypes from 'prop-types';
import Ajv from 'ajv';
import schema from './schemas/TicketCard.schema.json';
import { getToken } from '../../src/utils/tokens.js';
import ModifierList from './ModifierList.jsx';
import BumpAction from './BumpAction.jsx';

function requireToken(path) {
  const value = getToken(path);
  if (!value) {
    const message = `Missing required token: ${path}`;
    console.error(message);
    throw new Error(message);
  }
  return value;
}

const ajv = new Ajv();
const validate = ajv.compile(schema);

/**
 * Display an individual kitchen ticket with items and modifiers.
 *
 * Schema: `TicketCard.schema.json` defines accepted properties.
 * Density: supports `comfortable` and `compact` for spacing.
 * Layout: vertical card.
 * Accessibility: high contrast labels, logical tab order ending on bump button.
 * Performance: aim for <5ms render per ticket with up to 10 items.
 *
 * @param {object} props - See `TicketCard.schema.json`.
 * @param {(id: number|string) => void} [props.onBump] - Callback when bumping.
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
  expeditor,
  onBump,
  style,
}) {
  if (style !== undefined) {
    throw new Error('style prop is not supported');
  }
  if (
    !validate({
      orderId,
      orderNumber,
      orderType,
      createdTs,
      allergy,
      specialInstructions,
      items,
      stationType,
      expeditor,
    })
  ) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  const surface = requireToken('color.surface');
  const radius = requireToken('radius.card');
  const padding = requireToken('space.sm');
  const date = new Date(createdTs * 1000);
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
  return (
    <div
      className={`ticket ${orderType ? orderType.replace(/\s+/g, '-').toLowerCase() : ''} ${
        expeditor ? 'expeditor' : ''
      }`}
      data-order-id={orderId}
      data-created-ts={createdTs}
      style={{
        '--ticket-surface': surface,
        '--ticket-radius': radius,
        '--ticket-padding': padding,
      }}
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
          <li
            key={idx}
            className={`item ${item.stationId ? 'station-' + item.stationId : ''} ${
              item.state ? 'state-' + item.state : ''
            }`}
            {...(item.rollupId ? { 'data-rollup-id': item.rollupId } : {})}
          >
            <span className="qty">{item.quantity}×</span>
            <span
              className="item-name"
              data-item-id={item.itemId}
              {...(item.stationId ? { 'data-station-id': item.stationId } : {})}
            >
              {item.name}
            </span>
            <ModifierList modifiers={item.modifiers || []} />
            {item.specialInstructions && (
              <div className={`ticket-instructions${item.allergy ? ' allergy' : ''}`}>
                {item.specialInstructions}
              </div>
            )}
            {item.allergy && <div className="allergy-label">ALLERGY</div>}
          </li>
        ))}
      </ul>
      {onBump && <BumpAction onBump={() => onBump(orderId)} />}
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
  expeditor: PropTypes.bool,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      itemId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      stationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      state: PropTypes.oneOf([
        'queued',
        'in-progress',
        'ready',
        'bumped',
        'recalled',
      ]),
      rollupId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      modifiers: PropTypes.arrayOf(PropTypes.string),
      specialInstructions: PropTypes.string,
      allergy: PropTypes.bool,
    })
  ).isRequired,
  onBump: PropTypes.func,
  style: (props, propName, componentName) => {
    if (props[propName] !== undefined) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Use tokens or className instead.`);
    }
    return null;
  },
};

export default TicketCard;
