const { expect } = require('chai');
const React = require('react');
const { render } = require('@testing-library/react');
const { axe } = require('jest-axe');
require('esbuild-register/dist/node').register({ extensions: ['.js', '.jsx'] });
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

let TicketCard;

function matchSnapshot(html, name) {
  const dir = path.join(__dirname, '__snapshots__');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, html);
  }
  const expected = fs.readFileSync(file, 'utf8');
  expect(html).to.equal(expected);
}

describe('TicketCard renderer', () => {
  before(async () => {
    ({ TicketCard } = (await import('../../packages/renderers/index.js')).default);
  });

  it('matches snapshot and has no a11y violations', async () => {
    const props = {
      orderId: 1,
      orderNumber: 'A1',
      orderType: 'DINE-IN',
      createdTs: 0,
      items: [
        {
          itemId: 1,
          name: 'Burger',
          quantity: 1,
          modifiers: ['Cheese'],
        },
      ],
    };
    const { container } = render(React.createElement(TicketCard, props));
    matchSnapshot(container.innerHTML, 'TicketCard.html');
    const results = await axe(container);
    expect(results.violations).to.deep.equal([]);
  });
});
