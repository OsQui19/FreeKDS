const { expect } = require('chai');
const React = require('react');
const { render } = require('@testing-library/react');
const { JSDOM } = require('jsdom');
require('esbuild-register/dist/node').register({
  extensions: ['.js', '.jsx'],
  define: { 'import.meta.env.DEV': 'true' },
});
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

let AppErrorBoundary;

describe('AppErrorBoundary', () => {
  before(() => {
    ({ default: AppErrorBoundary } = require('../src/components/AppErrorBoundary.jsx'));
  });

  it('renders fallback with error details in dev mode', () => {
    function ProblemChild() {
      throw new Error('test error');
    }
    const { getByText } = render(
      React.createElement(AppErrorBoundary, null, React.createElement(ProblemChild))
    );
    expect(getByText('Something went wrong.')).to.exist;
    expect(getByText(/test error/)).to.exist;
  });
});
