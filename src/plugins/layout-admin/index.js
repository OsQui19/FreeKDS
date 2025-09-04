import manifest from './plugin.json';
import LayoutAdminPanel from '@/plugins/layoutAdminPanel.js';

export const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: LayoutAdminPanel,
    })),
  },
};

export default function LayoutAdminPlugin() {
  return null;
}

