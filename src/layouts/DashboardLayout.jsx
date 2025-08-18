import React from 'react';
import MainLayout from './MainLayout.jsx';

export default function DashboardLayout({ children }) {
  return (
    <MainLayout>
      <main className="flex-grow-1 container py-3">{children}</main>
    </MainLayout>
  );
}
