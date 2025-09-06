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
      /* ignore */
    }
    // Apply theme as CSS variable overrides to integrate with token-based styling
    try {
      const root = document.documentElement;
      root.setAttribute('data-theme', themeName);
      const colors = (themes?.[themeName]?.colors) || {};
      const bg = colors.background;
      const text = colors.text;
      const accent = colors.accent || colors.primary;
      // Derive a surface if not provided
      const surface = colors.surface || (themeName === 'dark' ? '#262b3a' : '#f8f9fa');
      if (bg) root.style.setProperty('--token-color-background', bg);
      if (text) root.style.setProperty('--token-color-text', text);
      if (accent) root.style.setProperty('--token-color-accent', accent);
      if (surface) root.style.setProperty('--token-color-surface', surface);
      // Allow focus ring to adapt
      if (accent) root.style.setProperty('--token-focus-color', accent);
    } catch {
      /* ignore */
    }
  }, [themeName, themes]);

  const currentTheme = themes[themeName];
  if (!currentTheme) {
    console.error(`Theme '${themeName}' not found`);
  }
  const value = { themeName, setThemeName, toggleTheme, theme: currentTheme };

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
