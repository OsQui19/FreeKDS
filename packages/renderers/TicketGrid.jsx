const React = require('react');
const PropTypes = require('prop-types');
const TicketCard = require('./TicketCard.jsx');
const ExpoHeader = require('./ExpoHeader.jsx');

/**
 * Arrange tickets in a responsive grid for the kitchen display.
 *
 * Density: `comfortable` or `compact` spacing.
 * Layout: `grid` or `list` mode via CSS classes.
 * Accessibility: maintains DOM order for logical focus navigation.
 * Performance: aim for <16ms render for up to 20 tickets.
 *
 * @param {object} props
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
}) {
  return (
    <div className={`ticket-grid ${layout} ${density}`}>
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
};

module.exports = TicketGrid;
