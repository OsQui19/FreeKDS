import React from 'react';
import IngredientField from './IngredientField.js';
import { useAdminMenu } from './AdminMenuContext.js';

export default function IngredientList() {
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
