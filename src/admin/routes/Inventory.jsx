import React, { useEffect, useMemo, useState } from 'react';

function useAdminData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin');
      if (!res.ok) throw new Error('Failed to load admin data');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);
  return { data, loading, error, reload };
}

export default function InventoryRoute() {
  const { data, loading, error, reload } = useAdminData();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Ingredients', value: data.ingredients?.length || 0 },
      { label: 'Suppliers', value: data.suppliers?.length || 0 },
      { label: 'Purchase Orders', value: data.orders?.length || 0 },
      { label: 'Locations', value: data.locations?.length || 0 },
      { label: 'Units', value: data.units?.length || 0 },
      { label: 'Tags', value: data.tags?.length || 0 },
    ];
  }, [data]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveIngredient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new URLSearchParams();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) body.append(k, String(v));
      });
      await fetch('/api/admin/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        redirect: 'follow',
      });
      setForm({});
      await reload();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const currentUnits = data?.units || [];
  const currentCats = data?.itemCategories || [];
  const currentTags = data?.tags || [];

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="admin-header">
        <h3 className="m-0">Inventory</h3>
        <button className="btn btn-sm btn-outline-primary" onClick={reload}>
          Refresh
        </button>
      </div>

      <div className="admin-grid">
        {summary.map((s) => (
          <div key={s.label} className="card-surface p-3">
            <div className="text-muted small">{s.label}</div>
            <div className="fs-3 fw-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-section mt-3">
        <h5 className="mb-3">Add / Edit Ingredient</h5>
        <form className="row g-2" onSubmit={saveIngredient}>
          <div className="col-md-3">
            <input className="form-control" placeholder="Name" value={form.name||''} onChange={(e)=>setField('name', e.target.value)} required />
          </div>
          <div className="col-md-2">
            <input className="form-control" placeholder="Quantity" type="number" step="any" value={form.quantity||''} onChange={(e)=>setField('quantity', e.target.value)} />
          </div>
          <div className="col-md-2">
            <select className="form-select" value={form.unit_id||''} onChange={(e)=>setField('unit_id', e.target.value)}>
              <option value="">Unit</option>
              {currentUnits.map(u => <option key={u.id} value={u.id}>{u.abbreviation||u.name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={form.category_id||''} onChange={(e)=>setField('category_id', e.target.value)}>
              <option value="">Category</option>
              {currentCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <input className="form-control" placeholder="SKU" value={form.sku||''} onChange={(e)=>setField('sku', e.target.value)} />
          </div>
          <div className="col-md-2">
            <input className="form-control" placeholder="Total Cost" type="number" step="any" value={form.cost||''} onChange={(e)=>setField('cost', e.target.value)} />
          </div>
          <div className="col-md-3">
            <select multiple className="form-select" value={form.tag_ids||[]} onChange={(e)=>setField('tag_ids', Array.from(e.target.selectedOptions).map(o=>o.value))}>
              {currentTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="isPublic" checked={!!form.is_public} onChange={(e)=>setField('is_public', e.target.checked ? 1 : 0)} />
              <label htmlFor="isPublic" className="form-check-label ms-1">Public</label>
            </div>
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100" disabled={saving}>Save</button>
          </div>
        </form>
      </div>

      <div className="admin-section mt-3">
        <h5 className="mb-2">Ingredients</h5>
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>SKU</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {(data.ingredients||[]).map(ing => (
                <tr key={ing.id}>
                  <td>{ing.name}</td>
                  <td>{ing.quantity}</td>
                  <td>{ing.unit}</td>
                  <td>{ing.sku||'-'}</td>
                  <td>{ing.cost??'-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
