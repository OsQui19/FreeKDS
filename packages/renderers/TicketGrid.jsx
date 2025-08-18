const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const gridSchema = require('./schemas/TicketGrid.schema.json');
const ticketSchema = require('./schemas/TicketCard.schema.json');
const { getToken } = require('../../src/utils/tokens.js');
const TicketCard = require('./TicketCard.jsx');
const ExpoHeader = require('./ExpoHeader.jsx');

function requireToken(path) {
  const value = getToken(path);
  if (!value) {
    const message = `Missing required token: ${path}`;
    console.error(message);
    throw new Error(message);
  }
  return value;
}

const ajv = new Ajv({ schemas: [ticketSchema] });
const validate = ajv.compile(gridSchema);

/**
 * Arrange tickets in a responsive grid for the kitchen display.
 *
 * Schema: `TicketGrid.schema.json` defines accepted properties.
 * Density: `comfortable` or `compact` spacing.
 * Layout: `grid` or `list` mode via CSS classes.
 * Accessibility: maintains DOM order for logical focus navigation.
 * Performance: aim for <16ms render for up to 20 tickets.
 *
 * @param {object} props - See `TicketGrid.schema.json`.
 * @param {Array} props.tickets - Array of ticket objects passed to TicketCard.
 * @param {string} [props.stationType] - Station type to customize rendering.
 * @param {'comfortable'|'compact'} [props.density]
 * @param {'grid'|'list'} [props.layout]
 * @param {(id: number|string) => void} [props.onBump]
 */
function TicketGrid({
  tickets,
  stationType,
  density = 'comfortable',
  layout = 'grid',
  onBump,
  style,
}) {
  if (style !== undefined) {
    throw new Error('style prop is not supported');
  }
  if (!validate({ tickets, stationType, density, layout })) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  const gap = requireToken('space.md');
  const background = requireToken('color.background');

  return (
    <div
      className={`ticket-grid ${layout} ${density}`}
      style={{ '--ticket-grid-gap': gap, '--ticket-grid-background': background }}
    >
      {stationType === 'expo' && <ExpoHeader title="Expo" />}
      {tickets.map((t) => (
        <TicketCard key={t.orderId} stationType={stationType} onBump={onBump} {...t} />
      ))}
    </div>
  );
}

TicketGrid.propTypes = {
  tickets: PropTypes.arrayOf(PropTypes.shape(TicketCard.propTypes)).isRequired,
  stationType: PropTypes.string,
  density: PropTypes.oneOf(['comfortable', 'compact']),
  layout: PropTypes.oneOf(['grid', 'list']),
  onBump: PropTypes.func,
  style: (props, propName, componentName) => {
    if (props[propName] !== undefined) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Use tokens or className instead.`);
    }
    return null;
  },
};

module.exports = TicketGrid;
