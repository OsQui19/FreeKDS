import { u as useToast, a as useConfirm, r as reactExports, b as useNavigate, j as jsxRuntimeExports, f as formatDate, L as Link } from "./app-CEUZD3nV.js";
function PurchaseOrdersRoute() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders] = reactExports.useState([]);
  const [suppliers, setSuppliers] = reactExports.useState([]);
  const [locations, setLocations] = reactExports.useState([]);
  const [error, setError] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [form, setForm] = reactExports.useState({ order_date: "", supplier_id: "", location_id: "" });
  useNavigate();
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin");
      const json = await res.json();
      setOrders(json.orders || []);
      setSuppliers(json.suppliers || []);
      setLocations(json.locations || []);
    } catch (e) {
      setError("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const create = async (e) => {
    e.preventDefault();
    const body = new URLSearchParams();
    body.append("order_date", form.order_date);
    body.append("supplier_id", form.supplier_id);
    if (form.location_id) body.append("location_id", form.location_id);
    const res = await fetch("/api/admin/purchase-orders", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, redirect: "follow" });
    await load();
    if (res.ok) push("Purchase order created");
    else push("Failed to create purchase order", { variant: "danger" });
  };
  const del = async (id) => {
    const ok = await confirm("Delete this purchase order?", { title: "Delete purchase order", confirmText: "Delete", variant: "danger" });
    if (!ok) return;
    const body = new URLSearchParams();
    body.append("id", id);
    const res = await fetch("/api/admin/purchase-orders/delete", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    await load();
    push(res.ok ? "Purchase order deleted" : "Failed to delete purchase order", { variant: res.ok ? "success" : "danger" });
  };
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading…" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "admin-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3", children: "Purchase Orders" }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "row g-2 mb-3", onSubmit: create, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-md-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label small", children: "Order Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", className: "form-control", value: form.order_date, onChange: (e) => setForm((f) => ({ ...f, order_date: e.target.value })), required: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-md-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label small", children: "Supplier" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "form-select", value: form.supplier_id, onChange: (e) => setForm((f) => ({ ...f, supplier_id: e.target.value })), required: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select…" }),
          suppliers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.name }, s.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-md-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label small", children: "Location" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "form-select", value: form.location_id, onChange: (e) => setForm((f) => ({ ...f, location_id: e.target.value })), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "(optional)" }),
          locations.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: l.id, children: l.name }, l.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2 d-flex align-items-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary w-100", children: "Create" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-responsive", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table table-sm align-middle", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "ID" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Supplier" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Location" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: orders.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.id }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatDate(o.order_date) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.supplier_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.location_name || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.status || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { className: "btn btn-sm btn-outline-primary me-2", to: `/admin/purchase-orders/${o.id}`, children: "View" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: () => del(o.id), children: "Delete" })
        ] })
      ] }, o.id)) })
    ] }) })
  ] });
}
export {
  PurchaseOrdersRoute as default
};
//# sourceMappingURL=PurchaseOrders-CXGmY3C2.js.map
