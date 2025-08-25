const { expect } = require('chai');
const React = require('react');
const { render, screen } = require('@testing-library/react');
const { JSDOM } = require('jsdom');
require('esbuild-register/dist/node').register({
  extensions: ['.js', '.jsx'],
  define: { 'import.meta.env.DEV': 'true' },
});
const path = require('path');
const Module = require('module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return resolve.call(this, request, parent, isMain, options);
};

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const { ThemeProvider } = require('../src/contexts/ThemeContext.jsx');
const { MemoryRouter } = require('react-router-dom');

describe('AppNavbar token fallback', () => {
  afterEach(() => {
    delete require.cache[require.resolve('../src/components/AppNavbar.jsx')];
    delete global.fetch;
  });

  it('renders with default tokens when API returns empty object', () => {
    global.fetch = async () => ({ ok: true, json: async () => ({}) });
    const AppNavbar = require('../src/components/AppNavbar.jsx').default;
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AppNavbar))
      )
    );
    const brand = screen.getByText('FreeKDS');
    const nav = brand.closest('nav');
    expect(nav.style.backgroundColor).to.equal('rgb(248, 249, 250)');
  });

  it('renders with default tokens when API returns values without $value', () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        color: { surface: { value: '#000000' }, text: { value: '#000000' } },
      }),
    });
    const AppNavbar = require('../src/components/AppNavbar.jsx').default;
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AppNavbar))
      )
    );
    const brand = screen.getByText('FreeKDS');
    const nav = brand.closest('nav');
    expect(nav.style.backgroundColor).to.equal('rgb(248, 249, 250)');
  });
});

describe('AppFooter token fallback', () => {
  afterEach(() => {
    delete require.cache[require.resolve('../src/components/AppFooter.jsx')];
    delete global.fetch;
  });

  it('renders with default tokens when API returns empty object', () => {
    global.fetch = async () => ({ ok: true, json: async () => ({}) });
    const AppFooter = require('../src/components/AppFooter.jsx').default;
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AppFooter))
      )
    );
    const footerText = screen.getByText(/FreeKDS/);
    const footer = footerText.closest('footer');
    expect(footer.style.backgroundColor).to.equal('rgb(248, 249, 250)');
  });

  it('renders with default tokens when API returns values without $value', () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        color: { surface: { value: '#000000' }, text: { value: '#000000' } },
      }),
    });
    const AppFooter = require('../src/components/AppFooter.jsx').default;
    render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AppFooter))
      )
    );
    const footerText = screen.getByText(/FreeKDS/);
    const footer = footerText.closest('footer');
    expect(footer.style.backgroundColor).to.equal('rgb(248, 249, 250)');
  });
});
