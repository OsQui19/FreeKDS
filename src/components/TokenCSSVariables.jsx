import React from 'react';
import { resolveTokens } from '@/utils/tokens.js';

function setVars(prefix, obj, vars) {
  Object.entries(obj || {}).forEach(([key, val]) => {
    const name = prefix ? `${prefix}-${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('$value' in val) {
        vars[`--token-${name}`] = String(val.$value);
      } else {
        setVars(name, val, vars);
      }
    }
  });
}

export default function TokenCSSVariables() {
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tokens = (await resolveTokens()) || {};
        if (!active) return;
        const vars = {};
        setVars('', tokens, vars);
        const root = document.documentElement;
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      } catch {
        /* ignore */
      }
    })();
    return () => { active = false };
  }, []);
  return null;
}

