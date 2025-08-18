import React from 'react';
import Builder from '@/features/LayoutBuilder/Builder.jsx';
import { LayoutProvider } from '@/contexts/LayoutContext.jsx';

function LayoutAdminPanel() {
  return (
    <LayoutProvider>
      <Builder />
    </LayoutProvider>
  );
}

export const meta = {
  id: 'layout-admin',
  name: 'Layout Administration',
  route: '/admin/layouts',
  contributes: {
    adminPanels: [
      {
        id: 'layouts',
        title: 'Layouts',
        Component: LayoutAdminPanel,
        requiredDomains: ['layouts'],
        requiredScopes: ['layouts:read', 'layouts:write'],
        latency: 'interactive',
      },
    ],
  },
};

export default function LayoutPlugin() {
  return null;
}
