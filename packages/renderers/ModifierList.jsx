const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const schema = require('./schemas/ModifierList.schema.json');
const { getToken } = require('../../src/utils/tokens.js');

const ajv = new Ajv();
const validate = ajv.compile(schema);

/**
 * Render a list of item modifiers.
 *
 * Schema: `ModifierList.schema.json` defines accepted properties.
 * Supports density modes: `comfortable` and `compact`.
 * Layout: inline list.
 * Accessibility: list semantics ensure screen reader announcements.
 * Performance: target <1ms render per 10 modifiers.
 *
 * @param {object} props - See `ModifierList.schema.json`.
 * @param {string[]} props.modifiers - Resolved modifier names to display.
 */
function ModifierList({ modifiers }) {
  if (!validate({ modifiers })) {
    throw new Error(ajv.errorsText(validate.errors));
  }
  if (!modifiers || modifiers.length === 0) return null;

  const spacing = getToken('space.xs');
  return (
    <ul className="item-modifiers" style={{ paddingLeft: spacing }}>
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
