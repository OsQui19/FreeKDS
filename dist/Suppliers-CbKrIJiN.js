import { r as reactExports, j as jsxRuntimeExports } from "./app-z9U9ikwo.js";
function SuppliersRoute() {
  const [suppliers, setSuppliers] = reactExports.useState([]);
  const [error, setError] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [form, setForm] = reactExports.useState({ id: "", name: "", contact_info: "" });
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin");
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (e) {
      setError("Failed to load suppliers");
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
      body.append("name", form.name);
      if (form.contact_info) body.append("contact_info", form.contact_info);
      await fetch("/api/admin/suppliers", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      setForm({ id: "", name: "", contact_info: "" });
      await load();
    } catch {
      setError("Save failed");
    }
  };
  const del = async (id) => {
    const body = new URLSearchParams();
    body.append("id", id);
    await fetch("/api/admin/suppliers/delete", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    await load();
  };
  const startEdit = (s) => setForm({ id: s.id, name: s.name || "", contact_info: s.contact_info || "" });
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading…" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "admin-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3", children: "Suppliers" }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "row g-2 mb-3", onSubmit: save, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-control", placeholder: "Name", value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), required: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-control", placeholder: "Contact info", value: form.contact_info, onChange: (e) => setForm((f) => ({ ...f, contact_info: e.target.value })) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary w-100", children: form.id ? "Update" : "Add" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2", children: form.id && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-secondary w-100", onClick: () => setForm({ id: "", name: "", contact_info: "" }), children: "Cancel" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-responsive", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table table-sm align-middle", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Contact" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: suppliers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.contact_info || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => startEdit(s), children: "Edit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: () => del(s.id), children: "Delete" })
        ] })
      ] }, s.id)) })
    ] }) })
  ] });
}
export {
  SuppliersRoute as default
};
//# sourceMappingURL=Suppliers-CbKrIJiN.js.map
