import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const themes = {
  light: {
    '--color-bg': '#f8f8f8',
    '--color-text': '#000000',
    '--color-primary': '#4f46e5',
    '--color-accent': '#a78bfa'
  },
  dark: {
    '--color-bg': '#1e2030',
    '--color-text': '#e5e5e5',
    '--color-primary': '#0084ff',
    '--color-accent': '#6699ff'
  }
};

function applyTheme(themeName) {
  const root = document.documentElement;
  const vars = themes[themeName];
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
