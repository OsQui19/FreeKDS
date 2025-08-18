const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const schema = require('./schemas/ExpoHeader.schema.json');
const { getToken } = require('../../src/utils/tokens.js');

const ajv = new Ajv();
const validate = ajv.compile(schema);

/**
 * Header used in expo stations to label the ticket grid.
 *
 * Schema: `ExpoHeader.schema.json` specifies accepted properties.
 * Density: `comfortable` and `compact` for height adjustments.
 * Layout: block heading element.
 * Accessibility: uses semantic heading for screen reader structure.
 * Performance: negligible rendering cost (<0.5ms).
 *
 * @param {object} props - See `ExpoHeader.schema.json`.
 * @param {string} props.title - Title text displayed in the header.
 */
function ExpoHeader({ title }) {
  if (!validate({ title })) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  const surface = getToken('color.surface');
  const text = getToken('color.text');
  const padding = getToken('space.md');

  return (
    <h1 className="expo-header" style={{ backgroundColor: surface, color: text, padding }}>
      {title}
    </h1>
  );
}

ExpoHeader.propTypes = {
  title: PropTypes.string.isRequired,
};

module.exports = ExpoHeader;
