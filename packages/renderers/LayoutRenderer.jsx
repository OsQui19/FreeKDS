import React from 'react';
import PropTypes from 'prop-types';
import Ajv from 'ajv';
import schema from '../../schemas/layout.schema@1.0.0.json';
import { getToken } from '../../src/utils/tokens.js';
import TicketGrid from './TicketGrid.jsx';

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

function requireToken(path) {
  const value = getToken(path);
  if (!value) {
    const message = `Missing required token: ${path}`;
    console.error(message);
    throw new Error(message);
  }
  return value;
}

function resolveStyle(style = {}) {
  const out = {};
  if (!style) return out;
  Object.entries(style).forEach(([k, v]) => {
    const token = requireToken(v);
    out[k] = token;
  });
  return out;
}

function resolveText(text) {
  const match = typeof text === 'string' && text.match(/{{(.*?)}}/);
  if (match) {
    return requireToken(match[1]);
  }
  return text;
}

function renderBlock(block, idx) {
  const { type, props = {}, blocks = [], style } = block;
  const children = blocks.map((b, i) => renderBlock(b, i));
  const blockStyles = resolveStyle(style);
  const propStyles = resolveStyle(props.style);
  switch (type) {
    case 'Grid':
      return React.createElement(
        'div',
        { key: idx, style: { display: 'grid', ...blockStyles, ...propStyles } },
        children,
      );
    case 'Stack':
      return React.createElement(
        'div',
        { key: idx, style: { display: 'flex', flexDirection: 'column', ...blockStyles, ...propStyles } },
        children,
      );
    case 'Tabs':
      return React.createElement('div', { key: idx, style: { ...blockStyles, ...propStyles } }, children);
    case 'TicketList':
      return React.createElement(TicketGrid, { key: idx, ...props });
    case 'Filters':
      return React.createElement('div', { key: idx, style: { ...blockStyles, ...propStyles } }, children);
    case 'Header':
      return React.createElement(
        'header',
        { key: idx, style: { ...blockStyles, ...propStyles } },
        resolveText(props.text),
        children,
      );
    case 'Footer':
      return React.createElement('footer', { key: idx, style: { ...blockStyles, ...propStyles } }, resolveText(props.text), children);
    case 'AllDayAggregate':
      return React.createElement('div', { key: idx, style: { ...blockStyles, ...propStyles } }, children);
    case 'AllDayFilter':
      return React.createElement('div', { key: idx, style: { ...blockStyles, ...propStyles } }, children);
    default:
      return null;
  }
}

function LayoutRenderer({ layout }) {
  const data = typeof layout === 'string' ? JSON.parse(layout) : layout;
  if (!validateData(data)) {
    throw new Error('Invalid layout');
  }
  const screen = data.screens[0];
  return React.createElement(
    React.Fragment,
    null,
    screen.blocks.map((b, i) => renderBlock(b, i)),
  );
}

LayoutRenderer.propTypes = {
  layout: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
};

export default LayoutRenderer;
