import React from 'react';
import { resolveTokens } from '@/utils/tokens.js';

const DEFAULT_TOKENS = {
  color: {
    surface: { $value: '#f8f9fa' },
    text: { $value: '#212529' },
  },
};

export default function AppFooter() {
  const [tokens, setTokens] = React.useState(DEFAULT_TOKENS);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    let isMounted = true;
    const loadTokens = async () => {
      const t = (await resolveTokens()) || {};
      const merged = {
        ...DEFAULT_TOKENS,
        ...t,
        color: { ...DEFAULT_TOKENS.color, ...(t?.color || {}) },
      };
      if (isMounted) {
        setTokens(merged);
        setError(Object.keys(t).length === 0);
      }
    };
    loadTokens();
    return () => {
      isMounted = false;
    };
  }, []);
  const background =
    tokens.color?.surface?.$value ?? DEFAULT_TOKENS.color.surface.$value;
  const text = tokens.color?.text?.$value ?? DEFAULT_TOKENS.color.text.$value;
  return (
    <footer
      style={{ backgroundColor: background, color: text }}
      className="text-center py-3 mt-auto"
    >
      <small>&copy; {new Date().getFullYear()} FreeKDS</small>
      {error && (
        <div className="text-warning small">Default theme applied</div>
      )}
    </footer>
  );
}
