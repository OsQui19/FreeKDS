import { u as useToast, a as useConfirm, c as useParams, r as reactExports, j as jsxRuntimeExports } from "./app-CEUZD3nV.js";
function PurchaseOrderDetailRoute() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const { id } = useParams();
  const [data, setData] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [receiving, setReceiving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ ingredient_id: "", quantity: "", unit_id: "" });
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}`);
      if (!res.ok) throw new Error("Failed to load PO");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    load();
  }, [id]);
  const receive = async () => {
    setReceiving(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/receive`, { method: "POST" });
      await load();
      push(res.ok ? "Order received" : "Failed to receive order", { variant: res.ok ? "success" : "danger" });
    } finally {
      setReceiving(false);
    }
  };
  const addItem = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const body = new URLSearchParams();
      body.append("ingredient_id", form.ingredient_id);
      body.append("quantity", form.quantity);
      if (form.unit_id) body.append("unit_id", form.unit_id);
      const res = await fetch(`/api/admin/purchase-orders/${id}/items`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!res.ok) throw new Error("Add failed");
      setForm({ ingredient_id: "", quantity: "", unit_id: "" });
      await load();
      push("Item added");
    } catch (e2) {
      setError(e2.message || "Error");
    }
  };
  const delItem = async (itemId) => {
    const ok = await confirm("Remove this item from the order?", { title: "Remove item", confirmText: "Remove", variant: "danger" });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/items/${itemId}/delete`, { method: "POST" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
      push("Item deleted");
    } catch (e) {
      setError(e.message || "Error");
    }
  };
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading…" });
  if (error) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", children: error });
  if (!data) return null;
  const { order, items, ingredients, units } = data;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "admin-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "m-0", children: [
        "PO #",
        order.id
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-success ms-3", onClick: receive, disabled: receiving || order.status === "received", children: "Receive" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "row g-2 mb-3", onSubmit: addItem, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "form-select", value: form.ingredient_id, onChange: (e) => setForm((f) => ({ ...f, ingredient_id: e.target.value })), required: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Add ingredient…" }),
        (ingredients || []).map((ing) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: ing.id, children: ing.name }, ing.id))
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-control", placeholder: "Qty", type: "number", step: "any", value: form.quantity, onChange: (e) => setForm((f) => ({ ...f, quantity: e.target.value })), required: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "form-select", value: form.unit_id, onChange: (e) => setForm((f) => ({ ...f, unit_id: e.target.value })), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "(unit)" }),
        (units || []).map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u.id, children: u.abbreviation || u.name }, u.id))
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-md-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary w-100", children: "Add" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-responsive", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table table-sm align-middle", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ingredient" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qty" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Unit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: (items || []).map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx(ItemRow, { poId: order.id, item: it, units, onDeleted: () => delItem(it.id), onSaved: load }, it.id)) })
    ] }) })
  ] });
}
function ItemRow({ poId, item, units, onDeleted, onSaved }) {
  const [qty, setQty] = reactExports.useState(item.quantity);
  const [unitId, setUnitId] = reactExports.useState("");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setQty(item.quantity);
    setUnitId("");
  }, [item.id]);
  const save = async () => {
    setSaving(true);
    try {
      const body = new URLSearchParams();
      if (qty != null) body.append("quantity", String(qty));
      if (unitId) body.append("unit_id", String(unitId));
      const res = await fetch(`/api/admin/purchase-orders/${poId}/items/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      if (!res.ok) throw new Error("Save failed");
      await onSaved();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: item.ingredient_name }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { minWidth: "140px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        step: "any",
        className: "form-control form-control-sm",
        value: qty,
        onChange: (e) => setQty(e.target.value)
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { minWidth: "140px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "select",
      {
        className: "form-select form-select-sm",
        value: unitId,
        onChange: (e) => setUnitId(e.target.value),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: item.unit || "(unit)" }),
          (units || []).map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u.id, children: u.abbreviation || u.name }, u.id))
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-primary me-2", disabled: saving, onClick: save, children: "Save" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: onDeleted, children: "Delete" })
    ] })
  ] });
}
export {
  PurchaseOrderDetailRoute as default
};
//# sourceMappingURL=PurchaseOrderDetail-BAr476q3.js.map
