import { m as manifest, F as FeatureFlagsAdminPanel } from "./app-CEUZD3nV.js";
const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: FeatureFlagsAdminPanel
    }))
  }
};
function FeatureFlagsPlugin() {
  return null;
}
export {
  FeatureFlagsPlugin as default,
  meta
};
//# sourceMappingURL=index-DMxtKZYE.js.map
