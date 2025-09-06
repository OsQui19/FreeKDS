import React from 'react';
import PropTypes from 'prop-types';
import Ajv from 'ajv';
import gridSchema from './schemas/TicketGrid.schema.json';
import ticketSchema from './schemas/TicketCard.schema.json';
import TicketCard from './TicketCard.jsx';
import ExpoHeader from './ExpoHeader.jsx';

// Tokens are applied globally as CSS variables by TokenCSSVariables.
// The grid relies on CSS variable fallbacks in CSS to avoid async fetches here.

const ENABLE_VALIDATION = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production';
let validate;
let compileErr = null;
function validateData(data) {
  if (!ENABLE_VALIDATION) return true;
  if (!validate && !compileErr) {
    try {
      // Use Ajv (draft-07) and strip $schema to avoid requiring the 2020-12 build.
      const ajv = new Ajv({ allowUnionTypes: true, strict: false });
      const ticket = { ...ticketSchema };
      const grid = { ...gridSchema };
      delete ticket.$schema;
      delete grid.$schema;
      ajv.addSchema(ticket);
      validate = ajv.compile(grid);
    } catch (e) {
      compileErr = e; // CSP or other compile issue; skip runtime validation
      return true;
    }
  }
  return validate ? validate(data) : true;
}

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
  onTicketClick,
  selectedId,
  stationsMap,
  onItemToggle,
  style,
}) {
  if (style !== undefined) {
    throw new Error('style prop is not supported');
  }
  if (!validateData({ tickets, stationType, density, layout })) {
    throw new Error('Invalid TicketGrid props');
  }

  return (
    <div
      className={`ticket-grid ${layout} ${density}`}
      style={{}}
    >
      {stationType === 'expo' && <ExpoHeader title="Expo" />}
      {tickets.map((t) => (
        <div
          key={t.orderId}
          className={`ticket-wrap${selectedId===t.orderId ? ' selected' : ''}`}
          data-order-id={t.orderId}
          onClick={() => onTicketClick && onTicketClick(t.orderId)}
        >
          <TicketCard stationType={stationType} stationsMap={stationsMap} onBump={onBump ? () => onBump(t.orderId) : undefined} onItemToggle={onItemToggle} {...t} />
        </div>
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
  onTicketClick: PropTypes.func,
  selectedId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  stationsMap: PropTypes.object,
  onItemToggle: PropTypes.func,
  style: (props, propName, componentName) => {
    if (props[propName] !== undefined) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Use tokens or className instead.`);
    }
    return null;
  },
};

export default TicketGrid;
