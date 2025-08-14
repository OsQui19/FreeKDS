import React from 'react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext.jsx';

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="btn btn-secondary" onClick={toggleTheme}>
      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    </button>
  );
}

export default function MainLayout({ children }) {
  return (
    <ThemeProvider>
      <div className="d-flex flex-column min-vh-100">
        <header className="p-2">
          <ThemeToggleButton />
        </header>
        <main className="flex-grow-1">{children}</main>
      </div>
    </ThemeProvider>
  );
}
