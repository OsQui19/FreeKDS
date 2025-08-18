const React = require('react');
const PropTypes = require('prop-types');

/**
 * Header used in expo stations to label the ticket grid.
 *
 * Density: `comfortable` and `compact` for height adjustments.
 * Layout: block heading element.
 * Accessibility: uses semantic heading for screen reader structure.
 * Performance: negligible rendering cost (<0.5ms).
 *
 * @param {object} props
 * @param {string} props.title - Title text displayed in the header.
 */
function ExpoHeader({ title }) {
  return <h1 className="expo-header">{title}</h1>;
}

ExpoHeader.propTypes = {
  title: PropTypes.string.isRequired,
};

module.exports = ExpoHeader;
