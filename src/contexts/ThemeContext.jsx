import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import themeConfig from '../config/theme.json';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch {
      return 'light';
    }
  });
  const [themes] = useState(themeConfig);

  const toggleTheme = () =>
    setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    try {
      localStorage.setItem('theme', themeName);
    } catch {
      // Skip write if localStorage is unavailable
    }
  }, [themeName]);

  const value = { themeName, setThemeName, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={themes[themeName]}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
