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
    const loadTokens = async (retries = 3) => {
      try {
        const t = await resolveTokens();
        const merged = {
          ...DEFAULT_TOKENS,
          ...t,
          color: { ...DEFAULT_TOKENS.color, ...(t?.color || {}) },
        };
        if (isMounted) setTokens(merged);
      } catch (err) {
        if (retries > 0) {
          setTimeout(() => loadTokens(retries - 1), 500);
        } else {
          console.error('Failed to load tokens', err);
          if (isMounted) setError(true);
        }
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
