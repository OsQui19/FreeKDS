import { h as manifest } from "./app-CEUZD3nV.js";
function LayoutPlugin() {
  return null;
}
const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: LayoutPlugin
    }))
  }
};
function LayoutAdminPlugin() {
  return null;
}
export {
  LayoutAdminPlugin as default,
  meta
};
//# sourceMappingURL=index-C6CWnUdp.js.map
