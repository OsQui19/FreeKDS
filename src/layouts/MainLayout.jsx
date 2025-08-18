import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ThemeProvider } from '@/contexts/ThemeContext.jsx';
import AppNavbar from '@/components/AppNavbar.jsx';
import AppFooter from '@/components/AppFooter.jsx';

export default function MainLayout({ children }) {
  return (
    <ThemeProvider>
      <div className="d-flex flex-column min-vh-100">
        <AppNavbar />
        {children}
        <AppFooter />
      </div>
    </ThemeProvider>
  );
}
