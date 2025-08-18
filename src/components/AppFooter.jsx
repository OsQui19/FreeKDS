import React from 'react';
import { resolveTokens } from '@/utils/tokens.js';

export default function AppFooter() {
  const [tokens, setTokens] = React.useState(null);
  React.useEffect(() => {
    resolveTokens().then(setTokens);
  }, []);
  if (!tokens) return null;
  const background = tokens.color.surface.value;
  const text = tokens.color.text.value;
  return (
    <footer
      style={{ backgroundColor: background, color: text }}
      className="text-center py-3 mt-auto"
    >
      <small>&copy; {new Date().getFullYear()} FreeKDS</small>
    </footer>
  );
}
