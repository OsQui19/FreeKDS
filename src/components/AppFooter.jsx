import React from 'react';
import { getToken } from '@/utils/tokens.js';

export default function AppFooter() {
  const background = getToken('color.surface');
  const text = getToken('color.text');
  return (
    <footer
      style={{ backgroundColor: background, color: text }}
      className="text-center py-3 mt-auto"
    >
      <small>&copy; {new Date().getFullYear()} FreeKDS</small>
    </footer>
  );
}
