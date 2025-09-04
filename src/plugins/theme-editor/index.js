import manifest from './plugin.json';
import ThemeEditor from '@/features/admin/ThemeEditor.jsx';

export const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: ThemeEditor,
    })),
  },
};

export default function ThemeEditorPlugin() {
  return null;
}

