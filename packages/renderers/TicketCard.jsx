const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const schema = require('./schemas/TicketCard.schema.json');
const { getToken } = require('../../src/utils/tokens.js');
const ModifierList = require('./ModifierList.jsx');
const BumpAction = require('./BumpAction.jsx');

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
  onBump,
}) {
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
    })
  ) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  const surface = getToken('color.surface');
  const radius = getToken('radius.card');
  const padding = getToken('space.sm');
  const date = new Date(createdTs * 1000);
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
  return (
    <div
      className={`ticket ${orderType ? orderType.replace(/\s+/g, '-').toLowerCase() : ''}`}
      data-order-id={orderId}
      data-created-ts={createdTs}
      style={{ backgroundColor: surface, borderRadius: radius, padding }}
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
  onBump: PropTypes.func,
};

module.exports = TicketCard;
