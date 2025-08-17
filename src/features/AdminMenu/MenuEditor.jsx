import React from 'react';
import RecipeModal from '../../components/RecipeModal.jsx';
import { AdminMenuProvider } from './components/AdminMenuContext.js';
import IngredientList from './components/IngredientList.js';
import ModifierList from './components/ModifierList.js';

export default function MenuEditor({ ingredients = [], units = [], modifiers = [] }) {
  return (
    <AdminMenuProvider ingredients={ingredients} units={units}>
      <IngredientList />
      <ModifierList modifiers={modifiers} />
      <RecipeModal />
    </AdminMenuProvider>
  );
}
