import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext.jsx';
import TokenCSSVariables from '@/components/TokenCSSVariables.jsx';
import AppNavbar from '@/components/AppNavbar.jsx';
import AppFooter from '@/components/AppFooter.jsx';

export default function BaseLayout({ children }) {
  return (
    <ThemeProvider>
      <div className="d-flex flex-column min-vh-100">
        <TokenCSSVariables />
        <AppNavbar />
        {children ? children : <Outlet />}
        <AppFooter />
      </div>
    </ThemeProvider>
  );
}
