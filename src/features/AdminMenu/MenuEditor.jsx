import React from 'react';
import RecipeModal from '@/components/RecipeModal';
import { AdminMenuProvider } from './components/AdminMenuContext.js';
import IngredientList from './components/IngredientList.js';
import ModifierList from './components/ModifierList.js';
import ModifierManager from './components/ModifierManager.jsx';
import MenuItemsManager from './components/MenuItemsManager.jsx';

export default function MenuEditor({ ingredients = [], units = [], modifiers = [] }) {
  return (
    <AdminMenuProvider ingredients={ingredients} units={units}>
      <MenuItemsManager />
      <IngredientList />
      <ModifierList modifiers={modifiers} />
      <ModifierManager ingredients={ingredients} />
      <RecipeModal />
    </AdminMenuProvider>
  );
}

MenuEditor.meta = {
  id: 'menu',
  title: 'Menu',
  dataDomain: 'menu',
  scopes: ['menu:read', 'menu:write'],
  latencyClass: 'interactive',
};
