const { expect } = require('chai');
const React = require('react');
const { render, screen } = require('@testing-library/react');
const { JSDOM } = require('jsdom');

require('esbuild-register/dist/node').register({
  extensions: ['.js', '.jsx'],
  define: { 'import.meta.env.DEV': 'true' },
});

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

describe('Login page token fallback', () => {
  let BaseLayout;
  let LoginPage;
  let MemoryRouter;

  before(async () => {
    ({ default: BaseLayout } = await import('../src/layouts/BaseLayout.jsx'));
    ({ default: LoginPage } = await import(
      '../src/features/login/LoginPage.jsx'
    ));
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    global.fetch = async (url) => {
      if (url.startsWith('/api/tokens')) {
        return { ok: true, json: async () => ({}) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
  });

  it('renders without errors when token API returns empty object', async () => {
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          BaseLayout,
          null,
          React.createElement(LoginPage, null),
        ),
      ),
    );
    const heading = await screen.findByText('Employee Login');
    expect(heading).to.exist;
  });
});
