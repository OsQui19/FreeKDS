import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/utils/format.js';
import { useConfirm } from '@/contexts/ConfirmContext.jsx';

export default function MenuItemsManager() {
  const { confirm } = useConfirm();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // item or 'new'
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const categories = data?.categories || [];
  const stations = data?.stations || [];
  const mods = data?.mods || [];
  const modGroups = data?.modGroups || [];

  const startNew = () => setEdit({ id: '', name: '', price: '', station_id: stations[0]?.id || '', category_id: categories[0]?.id || '', recipe: '', is_available: 1, stock: '' });
  const startEdit = (it) => setEdit({ ...it, modifier_ids: it.modifier_ids || [] });
  const cancel = () => setEdit(null);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      if (!edit.name?.trim()) throw new Error('Name is required');
      if (edit.price === '' || Number.isNaN(Number(edit.price))) throw new Error('Valid price is required');
      if (!edit.station_id) throw new Error('Choose a screen');
      if (!edit.category_id) throw new Error('Choose a category');
      const body = new URLSearchParams();
      if (edit.id) body.append('id', edit.id);
      body.append('name', edit.name);
      body.append('price', edit.price || 0);
      body.append('station_id', edit.station_id);
      body.append('category_id', edit.category_id);
      if (edit.stock !== '') body.append('stock', edit.stock);
      if (edit.recipe !== undefined) body.append('recipe', edit.recipe);
      body.append('is_available', edit.is_available ? '1' : '0');
      // append modifiers if selected
      if (Array.isArray(edit.modifier_ids) && edit.modifier_ids.length) {
        edit.modifier_ids.forEach((id) => body.append('modifier_ids', String(id)));
      }
      const res = await fetch('/api/admin/items', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!res.ok) throw new Error('Save failed');
      setEdit(null);
      await load();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    const ok = await confirm('Delete this item? This cannot be undone.', { title: 'Delete item', confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    const body = new URLSearchParams();
    body.append('id', id);
    const res = await fetch('/api/admin/items/delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (res.ok) await load();
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="admin-section mt-3">
      <div className="d-flex align-items-center mb-2">
        <h5 className="m-0">Menu Items</h5>
        <button className="btn btn-sm btn-outline-primary ms-auto" onClick={startNew}>Add Item</button>
      </div>
      {edit && (
        <div className="card-surface p-3 mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small">Name</label>
              <input className={`form-control form-control-sm ${(!edit.name?.trim() && 'is-invalid')||''}`} value={edit.name} onChange={(e)=>setEdit((v)=>({...v,name:e.target.value}))} />
              {!edit.name?.trim() && <div className="invalid-feedback">Name is required</div>}
            </div>
            <div className="col-12">
              <label className="form-label small">Recipe (optional)</label>
              <textarea className="form-control form-control-sm" value={edit.recipe} onChange={(e)=>setEdit((v)=>({...v,recipe:e.target.value}))} rows={2} />
            </div>
            <div className="col-md-2">
              <label className="form-label small">Price</label>
              <input type="number" step="any" className={`form-control form-control-sm ${((edit.price==='' || Number.isNaN(Number(edit.price))) && 'is-invalid')||''}`} value={edit.price} onChange={(e)=>setEdit((v)=>({...v,price:e.target.value}))} />
              {(edit.price==='' || Number.isNaN(Number(edit.price))) && <div className="invalid-feedback">Enter a valid price</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label small">Station</label>
              <select className={`form-select form-select-sm ${(!edit.station_id && 'is-invalid')||''}`} value={edit.station_id} onChange={(e)=>setEdit((v)=>({...v,station_id:e.target.value}))}>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {!edit.station_id && <div className="invalid-feedback">Choose a screen</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label small">Category</label>
              <select className={`form-select form-select-sm ${(!edit.category_id && 'is-invalid')||''}`} value={edit.category_id} onChange={(e)=>setEdit((v)=>({...v,category_id:e.target.value}))}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!edit.category_id && <div className="invalid-feedback">Choose a category</div>}
            </div>
            <div className="col-md-2">
              <label className="form-label small">Stock</label>
              <input type="number" className="form-control form-control-sm" value={edit.stock ?? ''} onChange={(e)=>setEdit((v)=>({...v,stock:e.target.value}))} />
              <div className="form-text">Leave empty if not tracking stock</div>
            </div>
            <div className="col-md-2">
              <label className="form-label small d-block">Available</label>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" checked={!!edit.is_available} onChange={(e)=>setEdit((v)=>({...v,is_available:e.target.checked?1:0}))} />
              </div>
            </div>
            <div className="col-12">
              <label className="form-label small">Modifiers</label>
              <div className="row g-2">
                {modGroups.map((g) => (
                  <div className="col-md-4" key={g.id}>
                    <div className="card-surface p-2">
                      <div className="fw-bold small mb-1">{g.name}</div>
                      {(mods.filter((m) => m.group_id === g.id)).map((m) => (
                        <div className="form-check" key={m.id}>
                          <input className="form-check-input" type="checkbox" id={`mod-${m.id}`}
                                 checked={Array.isArray(edit.modifier_ids) && edit.modifier_ids.includes(m.id)}
                                 onChange={(e)=> setEdit((v)=> ({...v, modifier_ids: e.target.checked ? Array.from(new Set([...(v.modifier_ids||[]), m.id])) : (v.modifier_ids||[]).filter((x)=>x!==m.id) }))} />
                          <label className="form-check-label" htmlFor={`mod-${m.id}`}>{m.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-md-3 ms-auto text-end">
              <button className="btn btn-sm btn-primary me-2" disabled={saving || !edit.name?.trim() || edit.price==='' || Number.isNaN(Number(edit.price)) || !edit.station_id || !edit.category_id} onClick={save}>Save</button>
              <button className="btn btn-sm btn-secondary" onClick={cancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {(categories || []).map((c) => (
        <div key={c.id} className="mb-3">
          <h6 className="mb-2">{c.name}</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead><tr><th>Name</th><th>Price</th><th>Station</th><th>Available</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {(c.items || []).map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{formatCurrency(it.price)}</td>
                    <td>{it.station_name || it.station_id}</td>
                    <td>{it.is_available ? 'Yes' : 'No'}</td>
                    <td>{it.stock ?? '-'}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>startEdit(it)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>del(it.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!c.items?.length && <tr><td colSpan={6} className="text-muted">No items</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
