import manifest from './plugin.json';
import KitchenPresetsPanel from '@/features/admin/KitchenPresetsPanel.jsx';

export const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: KitchenPresetsPanel,
    })),
  },
};

export default function KitchenPresetsPlugin() {
  return null;
}
