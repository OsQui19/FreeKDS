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

LayoutAdminPanel.meta = {
  id: 'layouts',
  title: 'Layouts',
  dataDomain: 'layouts',
  scopes: ['layouts:read', 'layouts:write'],
  latencyClass: 'interactive',
};

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
      },
    ],
  },
};

export default function LayoutPlugin() {
  return null;
}
