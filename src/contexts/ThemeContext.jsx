import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import themeConfig from '../config/theme.json';

// Provide sane defaults so consumers can still render if the provider is absent
const ThemeContext = createContext({
  themeName: 'light',
  setThemeName: () => {},
  toggleTheme: () => {},
});

function ThemeProviderWithStyled({ children }) {
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

  const currentTheme = themes[themeName];
  if (!currentTheme) {
    console.error(`Theme '${themeName}' not found`);
  }
  const value = { themeName, setThemeName, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={currentTheme || themes.light}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export function FallbackThemeProvider({ children }) {
  return <>{children}</>;
}

// Export the appropriate provider depending on whether styled-components is available
export const ThemeProvider = StyledThemeProvider
  ? ThemeProviderWithStyled
  : FallbackThemeProvider;

export function useTheme() {
  return useContext(ThemeContext);
}
