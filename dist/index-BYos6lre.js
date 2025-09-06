import { d as clearTokenCache, e as emit, r as reactExports, j as jsxRuntimeExports, g as manifest } from "./app-CEUZD3nV.js";
const presetNames = [
  "fast-casual",
  "full-service",
  "barista",
  "qsr"
];
async function applyKitchenPreset(name) {
  const path = `tokens/presets/${name}.json`;
  let preset;
  try {
    const resp = await fetch(`/${path}`);
    preset = await resp.json();
  } catch {
    throw new Error("Unknown preset");
  }
  try {
    if (preset.tokens) {
      await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset.tokens)
      });
      clearTokenCache();
    }
  } catch {
  }
  try {
    if (preset.layout) {
      const res = await fetch(
        `/api/layout?name=${encodeURIComponent(preset.layout)}`
      );
      if (res.ok) {
        const { layout } = await res.json();
        await fetch("/api/layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout, name: "default" })
        });
      }
    }
  } catch {
  }
  try {
    if (Array.isArray(preset.routes)) {
      await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: preset.routes })
      });
    }
  } catch {
  }
  emit("config-updated", { preset: name });
}
function KitchenPresetsPanel() {
  const [selected, setSelected] = reactExports.useState("");
  const handleChange = async (e) => {
    const name = e.target.value;
    setSelected(name);
    if (name) {
      await applyKitchenPreset(name);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label me-2", children: "Preset" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "select",
      {
        className: "form-select d-inline-block w-auto",
        value: selected,
        onChange: handleChange,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select preset" }),
          presetNames.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: name, children: name }, name))
        ]
      }
    )
  ] });
}
KitchenPresetsPanel.meta = {
  id: "kitchen-presets",
  title: "Kitchen Presets",
  dataDomain: "layout",
  scopes: ["layout:write", "tokens:write", "routes:write"],
  latencyClass: "interactive"
};
const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: KitchenPresetsPanel
    }))
  }
};
function KitchenPresetsPlugin() {
  return null;
}
export {
  KitchenPresetsPlugin as default,
  meta
};
//# sourceMappingURL=index-BYos6lre.js.map
