import React from 'react';

const AdminMenuContext = React.createContext();

export function AdminMenuProvider({ ingredients = [], units = [], children }) {
  const [ingredientFields, setIngredientFields] = React.useState([
    { name: '', unitId: '', amount: '' },
  ]);
  const [modifiers, setModifiers] = React.useState({});

  const addIngredient = () =>
    setIngredientFields((fields) => [
      ...fields,
      { name: '', unitId: '', amount: '' },
    ]);

  const removeIngredient = (index) =>
    setIngredientFields((fields) => fields.filter((_, i) => i !== index));

  const updateIngredient = (index, field) =>
    setIngredientFields((fields) =>
      fields.map((f, i) => (i === index ? { ...f, ...field } : f)),
    );

  const toggleModifier = (id, checked) =>
    setModifiers((mods) => ({
      ...mods,
      [id]: { ...mods[id], checked },
    }));

  const setModifierReplace = (id, replace) =>
    setModifiers((mods) => ({
      ...mods,
      [id]: { ...mods[id], replace },
    }));

  const value = {
    ingredients,
    units,
    ingredientFields,
    addIngredient,
    removeIngredient,
    updateIngredient,
    modifiers,
    toggleModifier,
    setModifierReplace,
  };

  return React.createElement(AdminMenuContext.Provider, { value }, children);
}

export function useAdminMenu() {
  return React.useContext(AdminMenuContext);
}
