import React, { createContext, useContext, useEffect, useState } from 'react';
import { on } from '@/plugins/lifecycle.js';

const LayoutContext = createContext();

export function LayoutProvider({ children, name = 'default', stationId }) {
  const [layout, setLayout] = useState(null);

  const fetchLayout = async () => {
    try {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (stationId) params.append('stationId', stationId);
      const res = await fetch(`/api/layout?${params.toString()}`);
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
  }, [name, stationId]);

  useEffect(() => {
    const unsub = on('config-updated', fetchLayout);
    return unsub;
  }, [name, stationId]);

  const saveLayout = async (json) => {
    setLayout(json);
    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: json, name, stationId }),
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
