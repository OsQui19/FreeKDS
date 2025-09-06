import { u as useToast, a as useConfirm, r as reactExports, j as jsxRuntimeExports } from "./app-CEUZD3nV.js";
function LocationsRoute() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [locations, setLocations] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ id: "", name: "" });
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin");
      const json = await res.json();
      setLocations(json.locations || []);
    } catch (e) {
      setError("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      const body = new URLSearchParams();
      if (form.id) body.append("id", form.id);
      body.append("name", form.name || "");
      const res = await fetch("/api/admin/locations", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      await load();
      setForm({ id: "", name: "" });
      push(res.ok ? form.id ? "Location updated" : "Location added" : "Failed to save location", { variant: res.ok ? "success" : "danger" });
    } catch {
      push("Failed to save location", { variant: "danger" });
    }
  };
  const del = async (id) => {
    const ok = await confirm("Remove this location?", { title: "Remove location", confirmText: "Remove", variant: "danger" });
    if (!ok) return;
    const body = new URLSearchParams();
    body.append("id", id);
    const res = await fetch("/api/admin/locations/delete", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    await load();
    push(res.ok ? "Location deleted" : "Failed to delete location", { variant: res.ok ? "success" : "danger" });
  };
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading…" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "admin-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3", children: "Locations" }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "row g-2 mb-3", onSubmit: save, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-md-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: `form-control ${form.name !== void 0 && !String(form.name).trim() ? "is-invalid" : ""}`, placeholder: "Location name", value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), required: true }),
        form.name !== void 0 && !String(form.name).trim() && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "invalid-feedback", children: "Name is required" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary w-100", children: form.id ? "Update" : "Add" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2", children: form.id && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-secondary w-100", onClick: () => setForm({ id: "", name: "" }), children: "Cancel" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-responsive", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table table-sm align-middle", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-end" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        locations.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => setForm({ id: l.id, name: l.name || "" }), children: "Edit" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: () => del(l.id), children: "Delete" })
          ] })
        ] }, l.id)),
        !locations.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 2, className: "text-muted", children: "No locations" }) })
      ] })
    ] }) })
  ] });
}
export {
  LocationsRoute as default
};
//# sourceMappingURL=Locations-C57mGZM9.js.map
