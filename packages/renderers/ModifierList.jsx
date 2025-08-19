import React from 'react';
import PropTypes from 'prop-types';
import Ajv from 'ajv';
import schema from './schemas/ModifierList.schema.json';
import { getToken } from '../../src/utils/tokens.js';

function requireToken(path) {
  const value = getToken(path);
  if (!value) {
    const message = `Missing required token: ${path}`;
    console.error(message);
    throw new Error(message);
  }
  return value;
}

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
function ModifierList({ modifiers, style }) {
  if (style !== undefined) {
    throw new Error('style prop is not supported');
  }
  if (!validate({ modifiers })) {
    throw new Error(ajv.errorsText(validate.errors));
  }
  if (!modifiers || modifiers.length === 0) return null;

  const spacing = requireToken('space.xs');
  return (
    <ul
      className="item-modifiers"
      style={{ '--modifier-list-padding': spacing }}
    >
      {modifiers.map((m, i) => (
        <li key={i}>{m}</li>
      ))}
    </ul>
  );
}

ModifierList.propTypes = {
  modifiers: PropTypes.arrayOf(PropTypes.string).isRequired,
  style: (props, propName, componentName) => {
    if (props[propName] !== undefined) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Use tokens or className instead.`);
    }
    return null;
  },
};

export default ModifierList;
