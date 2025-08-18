import manifest from './plugin.json';
import FeatureFlagsAdminPanel from '@/features/featureFlags/FeatureFlagsAdminPanel.jsx';

export const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: FeatureFlagsAdminPanel,
    })),
  },
};

export default function FeatureFlagsPlugin() {
  return null;
}

