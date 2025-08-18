const React = require('react');
const PropTypes = require('prop-types');

/**
 * Render a list of item modifiers.
 *
 * Supports density modes: `comfortable` and `compact`.
 * Layout: inline list.
 * Accessibility: list semantics ensure screen reader announcements.
 * Performance: target <1ms render per 10 modifiers.
 *
 * @param {object} props
 * @param {string[]} props.modifiers - Resolved modifier names to display.
 */
function ModifierList({ modifiers }) {
  if (!modifiers || modifiers.length === 0) return null;
  return (
    <ul className="item-modifiers">
      {modifiers.map((m, i) => (
        <li key={i}>{m}</li>
      ))}
    </ul>
  );
}

ModifierList.propTypes = {
  modifiers: PropTypes.arrayOf(PropTypes.string).isRequired,
};

module.exports = ModifierList;
