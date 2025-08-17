const { expect } = require('chai');
const React = require('react');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const { render, screen, fireEvent } = require('@testing-library/react');
const { AdminMenuProvider, useAdminMenu } = require('../src/features/AdminMenu/components/AdminMenuContext.js');
const IngredientList = require('../src/features/AdminMenu/components/IngredientList.js');
const ModifierList = require('../src/features/AdminMenu/components/ModifierList.js');

describe('AdminMenu components', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds ingredient rows', () => {
    render(
      React.createElement(
        AdminMenuProvider,
        { ingredients: [], units: [] },
        React.createElement(IngredientList),
      ),
    );
    const addBtn = screen.getByText('Add Ingredient');
    expect(screen.getAllByPlaceholderText('Ingredient').length).to.equal(1);
    fireEvent.click(addBtn);
    expect(screen.getAllByPlaceholderText('Ingredient').length).to.equal(2);
  });

  it('saves modifier selections', () => {
    const modifiers = [{ id: 1, name: 'Extra Cheese' }];
    let ctx;
    function Capture() {
      ctx = useAdminMenu();
      return React.createElement(ModifierList, { modifiers });
    }
    render(
      React.createElement(
        AdminMenuProvider,
        { ingredients: [{ id: 1, name: 'Cheese' }], units: [] },
        React.createElement(Capture),
      ),
    );
    const checkbox = screen.getByLabelText('Extra Cheese');
    fireEvent.click(checkbox);
    const replaceSelect = screen.getByLabelText('Replace Extra Cheese');
    fireEvent.change(replaceSelect, { target: { value: '0' } });
    expect(ctx.modifiers[1].checked).to.be.true;
    expect(ctx.modifiers[1].replace).to.equal('0');
  });
});
