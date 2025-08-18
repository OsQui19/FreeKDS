import manifest from "./plugin.json";
import MenuEditor from "@/features/AdminMenu/MenuEditor.jsx";

export const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: MenuEditor,
      getProps: () => window.__ADMIN_MENU_DATA__ || {},
    })),
  },
};

export default function MenuPlugin() {
  return null;
}
