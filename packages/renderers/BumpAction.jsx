const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const schema = require('./schemas/BumpAction.schema.json');
const { getToken } = require('../../src/utils/tokens.js');

const ajv = new Ajv();
const validate = ajv.compile(schema);

/**
 * Action button used to bump a ticket from the queue.
 *
 * Schema: `BumpAction.schema.json` defines accepted properties.
 * Density: supports `comfortable` and `compact` for padding.
 * Layout: button element.
 * Accessibility: default label ensures accessible name and focusability.
 * Performance: should execute in <1ms per click handler.
 *
 * @param {object} props - See `BumpAction.schema.json`.
 * @param {() => void} props.onBump - Handler invoked when the ticket is bumped.
 * @param {string} [props.label] - Visible label for the button.
 */
function BumpAction({ onBump, label = 'Bump', style }) {
  if (style !== undefined) {
    throw new Error('style prop is not supported');
  }
  if (!validate({ label })) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  const padding = getToken('space.sm');
  const accent = getToken('color.accent');
  const radius = getToken('radius.card');

  return (
    <button
      type="button"
      className="bump-action"
      onClick={onBump}
      style={{
        '--bump-action-padding': padding,
        '--bump-action-bg': accent,
        '--bump-action-radius': radius,
      }}
    >
      {label}
    </button>
  );
}

BumpAction.propTypes = {
  onBump: PropTypes.func.isRequired,
  label: PropTypes.string,
  style: (props, propName, componentName) => {
    if (props[propName] !== undefined) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Use tokens or className instead.`);
    }
    return null;
  },
};

module.exports = BumpAction;
