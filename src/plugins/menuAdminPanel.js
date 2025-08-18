import MenuEditor from '@/features/AdminMenu/MenuEditor.jsx';

export const meta = {
  id: 'menu-admin',
  name: 'Menu Administration',
  route: '/admin/menu',
  contributes: {
    adminPanels: [
      {
        id: 'menu',
        title: 'Menu',
        Component: MenuEditor,
        getProps: () => window.__ADMIN_MENU_DATA__ || {},
        requiredDomains: ['menu'],
        requiredScopes: ['menu:read', 'menu:write'],
        latency: 'interactive',
      },
    ],
  },
};

export default function MenuPlugin() {
  return null;
}
