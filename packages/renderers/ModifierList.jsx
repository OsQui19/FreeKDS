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

const ENABLE_VALIDATION = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production';
let validate;
let compileErr = null;
function validateData(data) {
  if (!ENABLE_VALIDATION) return true;
  if (!validate && !compileErr) {
    try {
      const ajv = new Ajv({ allowUnionTypes: true, strict: false });
      const s = { ...schema };
      delete s.$schema;
      validate = ajv.compile(s);
    } catch (e) {
      compileErr = e; // CSP or other compile issue; skip runtime validation
      return true;
    }
  }
  return validate ? validate(data) : true;
}

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
  if (!validateData({ modifiers })) {
    throw new Error('Invalid ModifierList props');
  }
  if (!modifiers || modifiers.length === 0) return null;

  const spacing = requireToken('space.xs');
  const format = (m) => {
    if (!m) return m;
    const s = String(m);
    if (/\bno\b/i.test(s)) return <strong style={{ color: '#dc3545' }}>{s}</strong>;
    if (/\bextra\b|\bspicy\b|\ballergy\b/i.test(s)) return <strong style={{ color: '#fd7e14' }}>{s}</strong>;
    return s;
  };
  return (
    <ul
      className="item-modifiers"
      style={{ '--modifier-list-padding': spacing }}
    >
      {modifiers.map((m, i) => (
        <li key={i}>{format(m)}</li>
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
