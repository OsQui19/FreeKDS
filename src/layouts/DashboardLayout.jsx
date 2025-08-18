import React from 'react';
import BaseLayout from './BaseLayout.jsx';

export default function DashboardLayout({ children }) {
  return (
    <BaseLayout>
      <main className="flex-grow-1 container py-3">{children}</main>
    </BaseLayout>
  );
}
