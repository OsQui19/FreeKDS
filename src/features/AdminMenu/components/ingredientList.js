const React = require('react');
const IngredientField = require('./IngredientField.js');
const { useAdminMenu } = require('./AdminMenuContext.js');

function IngredientList() {
  const { ingredientFields, addIngredient } = useAdminMenu();
  return React.createElement(
    React.Fragment,
    null,
    ingredientFields.map((_, idx) =>
      React.createElement(IngredientField, { key: idx, index: idx }),
    ),
    React.createElement(
      'button',
      { type: 'button', onClick: addIngredient },
      'Add Ingredient',
    ),
  );
}

module.exports = IngredientList;
