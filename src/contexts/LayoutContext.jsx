import React, { createContext, useContext, useEffect, useState } from 'react';

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const res = await fetch('/api/layout');
        if (res.ok) {
          const data = await res.json();
          if (data.layout) setLayout(data.layout);
        }
      } catch {
        /* ignore */
      }
    };
    fetchLayout();
  }, []);

  const saveLayout = async (json, scope = 'user', userId) => {
    setLayout(json);
    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: json, scope, userId }),
      });
    } catch {
      /* ignore */
    }
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
