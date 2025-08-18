const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const schema = require('../../schemas/layout.schema@1.0.0.json');
const { getToken } = require('../../src/utils/tokens.js');
const TicketGrid = require('./TicketGrid.jsx');

const ajv = new Ajv();
const validate = ajv.compile(schema);

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
      return React.createElement('header', { key: idx, style: { ...blockStyles, ...propStyles } }, props.text, children);
    case 'Footer':
      return React.createElement('footer', { key: idx, style: { ...blockStyles, ...propStyles } }, children);
    default:
      return null;
  }
}

function LayoutRenderer({ layout }) {
  const data = typeof layout === 'string' ? JSON.parse(layout) : layout;
  if (!validate(data)) {
    throw new Error(ajv.errorsText(validate.errors));
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

module.exports = LayoutRenderer;
