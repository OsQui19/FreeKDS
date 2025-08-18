import React from 'react';
import RecipeModal from '@/components/RecipeModal';
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

MenuEditor.meta = {
  id: 'menu',
  title: 'Menu',
  dataDomains: ['menu'],
  scopes: ['menu:read', 'menu:write'],
  latency: 'interactive',
};
