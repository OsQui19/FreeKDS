const React = require('react');
const { useAdminMenu } = require('./AdminMenuContext.js');

function IngredientField({ index }) {
  const { ingredientFields, updateIngredient, removeIngredient, units } = useAdminMenu();
  const field = ingredientFields[index];
  return React.createElement(
    'div',
    { className: 'ingredient-row' },
    React.createElement('input', {
      placeholder: 'Ingredient',
      value: field.name,
      onChange: (e) => updateIngredient(index, { name: e.target.value }),
    }),
    React.createElement(
      'select',
      {
        value: field.unitId,
        onChange: (e) => updateIngredient(index, { unitId: e.target.value }),
      },
      React.createElement('option', { value: '' }, ''),
      units.map((u) =>
        React.createElement('option', { key: u.id, value: u.id }, u.abbreviation),
      ),
    ),
    React.createElement('input', {
      type: 'number',
      value: field.amount,
      onChange: (e) => updateIngredient(index, { amount: e.target.value }),
    }),
    React.createElement(
      'button',
      { type: 'button', onClick: () => removeIngredient(index) },
      'Remove',
    ),
  );
}

module.exports = IngredientField;
