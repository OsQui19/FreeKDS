import React from 'react';
import RecipeModal from '../../components/RecipeModal.jsx';
import useAdminMenu from './useAdminMenu.js';

export default function MenuEditor({ ingredients = [], units = [] }) {
  useAdminMenu({ ingredients, units });
  return <RecipeModal />;
}
