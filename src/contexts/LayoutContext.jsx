import React, { createContext, useContext, useEffect, useState } from 'react';

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('layout-schema');
    if (saved) setLayout(saved);
  }, []);

  const saveLayout = (json) => {
    setLayout(json);
    localStorage.setItem('layout-schema', json);
  };

  return (
    <LayoutContext.Provider value={{ layout, saveLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
