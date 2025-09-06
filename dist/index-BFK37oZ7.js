import { i as manifest, M as MenuEditor } from "./app-CEUZD3nV.js";
const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: MenuEditor,
      getProps: () => window.__ADMIN_MENU_DATA__ || {}
    }))
  }
};
function MenuPlugin() {
  return null;
}
export {
  MenuPlugin as default,
  meta
};
//# sourceMappingURL=index-BFK37oZ7.js.map
