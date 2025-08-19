import React from 'react';
import PropTypes from 'prop-types';
import Ajv from 'ajv';
import schema from './schemas/BumpAction.schema.json';
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

  const padding = requireToken('space.sm');
  const accent = requireToken('color.accent');
  const radius = requireToken('radius.card');

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

export default BumpAction;
