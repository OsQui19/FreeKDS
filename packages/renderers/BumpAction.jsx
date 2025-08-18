const React = require('react');
const PropTypes = require('prop-types');

/**
 * Action button used to bump a ticket from the queue.
 *
 * Density: supports `comfortable` and `compact` for padding.
 * Layout: button element.
 * Accessibility: default label ensures accessible name and focusability.
 * Performance: should execute in <1ms per click handler.
 *
 * @param {object} props
 * @param {() => void} props.onBump - Handler invoked when the ticket is bumped.
 * @param {string} [props.label] - Visible label for the button.
 */
function BumpAction({ onBump, label = 'Bump' }) {
  return (
    <button type="button" className="bump-action" onClick={onBump}>
      {label}
    </button>
  );
}

BumpAction.propTypes = {
  onBump: PropTypes.func.isRequired,
  label: PropTypes.string,
};

module.exports = BumpAction;
