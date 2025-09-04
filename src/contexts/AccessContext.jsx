import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AccessContext = createContext({
  allowed: [],
  loading: true,
  has: () => false,
});

export function AccessProvider({ children }) {
  const [allowed, setAllowed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin');
        if (!res.ok) throw new Error('Failed to load access');
        const json = await res.json();
        if (active) setAllowed(Array.isArray(json.allowedModules) ? json.allowedModules.map((m) => String(m).toLowerCase()) : []);
      } catch {
        if (active) setAllowed([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const has = useMemo(() => {
    return (moduleName) => {
      if (!moduleName) return false;
      const m = String(moduleName).toLowerCase();
      return allowed.includes(m);
    };
  }, [allowed]);

  const value = useMemo(() => ({ allowed, loading, has }), [allowed, loading, has]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}

