import React, { createContext, useContext, useEffect, useState } from 'react';
import themeConfig from '../config/theme.json';

// Provide sane defaults so consumers can still render if the provider is absent
const ThemeContext = createContext({
  themeName: 'light',
  setThemeName: () => {},
  toggleTheme: () => {},
});

function ThemeProviderWithStyled({ children }) {
  const [StyledThemeProvider, setStyledThemeProvider] = useState(null);
  const [themeName, setThemeName] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch {
      return 'light';
    }
  });
  const [themes] = useState(themeConfig);

  useEffect(() => {
    let active = true;
    import('styled-components')
      .then((mod) => {
        if (active) setStyledThemeProvider(() => mod.ThemeProvider);
      })
      .catch(() => {
        if (active) setStyledThemeProvider(null);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const ProviderComponent = StyledThemeProvider || FallbackThemeProvider;

  return (
    <ThemeContext.Provider value={value}>
      <ProviderComponent theme={currentTheme || themes.light}>
        {children}
      </ProviderComponent>
    </ThemeContext.Provider>
  );
}

export function FallbackThemeProvider({ children }) {
  return <>{children}</>;
}

export const ThemeProvider = ThemeProviderWithStyled;

export function useTheme() {
  return useContext(ThemeContext);
}
