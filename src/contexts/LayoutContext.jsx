import React, { createContext, useContext, useEffect, useState } from 'react';
import { on } from '@/plugins/lifecycle.js';

const LayoutContext = createContext();

export function LayoutProvider({ children, name = 'default' }) {
  const [layout, setLayout] = useState(null);

  const fetchLayout = async () => {
    try {
      const res = await fetch(`/api/layout?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.layout) setLayout(data.layout);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchLayout();
  }, [name]);

  useEffect(() => {
    const unsub = on('config-updated', fetchLayout);
    return unsub;
  }, [name]);

  const saveLayout = async (json) => {
    setLayout(json);
    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: json, name }),
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
