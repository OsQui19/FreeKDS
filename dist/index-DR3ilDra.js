import { r as reactExports, j as jsxRuntimeExports, k as manifest } from "./app-CEUZD3nV.js";
function ThemeEditor() {
  const [value, setValue] = reactExports.useState("");
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [ok, setOk] = reactExports.useState(false);
  reactExports.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tokens");
        const json = await res.json();
        setValue(JSON.stringify(json, null, 2));
      } catch (e) {
        setError("Failed to load tokens");
      }
    })();
  }, []);
  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const body = JSON.parse(value);
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("save");
      setOk(true);
    } catch (e) {
      setError("Invalid JSON or save failed");
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Theme Tokens" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted", children: "Edit design tokens as JSON and save." }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", children: error }),
    ok && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-success", children: "Saved" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        className: "form-control",
        rows: 20,
        value,
        onChange: (e) => setValue(e.target.value)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary mt-3", onClick: save, disabled: saving, children: saving ? "Saving…" : "Save" })
  ] });
}
ThemeEditor.meta = {
  id: "theme-editor",
  title: "Theme Editor",
  dataDomain: "tokens",
  scopes: ["tokens:write"],
  latencyClass: "interactive"
};
const meta = {
  ...manifest,
  contributes: {
    ...manifest.contributes,
    adminPanels: (manifest.contributes?.adminPanels || []).map((p) => ({
      ...p,
      Component: ThemeEditor
    }))
  }
};
function ThemeEditorPlugin() {
  return null;
}
export {
  ThemeEditorPlugin as default,
  meta
};
//# sourceMappingURL=index-DR3ilDra.js.map
