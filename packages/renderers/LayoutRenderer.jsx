const React = require('react');
const PropTypes = require('prop-types');
const Ajv = require('ajv');
const schema = require('../../schemas/layout.schema@1.0.0.json');
const { getToken } = require('../../src/utils/tokens.js');
const TicketGrid = require('./TicketGrid.jsx');

const ajv = new Ajv();
const validate = ajv.compile(schema);

function resolveStyle(style = {}) {
  const out = {};
  Object.entries(style).forEach(([k, v]) => {
    try {
      const token = getToken(v);
      out[k] = token || v;
    } catch {
      out[k] = v;
    }
  });
  return out;
}

function renderBlock(block, idx) {
  const { type, props = {}, blocks = [], style } = block;
  const children = blocks.map((b, i) => renderBlock(b, i));
  const styles = resolveStyle(style);
  switch (type) {
    case 'Grid':
      return React.createElement(
        'div',
        { key: idx, style: { display: 'grid', ...styles, ...props.style } },
        children,
      );
    case 'Stack':
      return React.createElement(
        'div',
        { key: idx, style: { display: 'flex', flexDirection: 'column', ...styles, ...props.style } },
        children,
      );
    case 'Tabs':
      return React.createElement('div', { key: idx, style: styles }, children);
    case 'TicketList':
      return React.createElement(TicketGrid, { key: idx, ...props });
    case 'Filters':
      return React.createElement('div', { key: idx, style: styles }, children);
    case 'Header':
      return React.createElement('header', { key: idx, style: styles }, props.text, children);
    case 'Footer':
      return React.createElement('footer', { key: idx, style: styles }, children);
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
