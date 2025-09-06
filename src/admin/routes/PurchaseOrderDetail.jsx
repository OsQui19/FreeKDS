import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useConfirm } from '@/contexts/ConfirmContext.jsx';
import { useParams } from 'react-router-dom';

export default function PurchaseOrderDetailRoute() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [form, setForm] = useState({ ingredient_id: '', quantity: '', unit_id: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}`);
      if (!res.ok) throw new Error('Failed to load PO');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  const receive = async () => {
    setReceiving(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/receive`, { method: 'POST' });
      await load();
      push(res.ok ? 'Order received' : 'Failed to receive order', { variant: res.ok ? 'success' : 'danger' });
    } finally {
      setReceiving(false);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const body = new URLSearchParams();
      body.append('ingredient_id', form.ingredient_id);
      body.append('quantity', form.quantity);
      if (form.unit_id) body.append('unit_id', form.unit_id);
      const res = await fetch(`/api/admin/purchase-orders/${id}/items`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!res.ok) throw new Error('Add failed');
      setForm({ ingredient_id: '', quantity: '', unit_id: '' });
      await load();
      push('Item added');
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  const delItem = async (itemId) => {
    const ok = await confirm('Remove this item from the order?', { title: 'Remove item', confirmText: 'Remove', variant: 'danger' });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/items/${itemId}/delete`, { method: 'POST' });
      if (!res.ok) throw new Error('Delete failed');
      await load();
      push('Item deleted');
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;
  const { order, items, ingredients, units } = data;
  return (
    <div className="admin-section">
      <div className="d-flex align-items-center mb-3">
        <h3 className="m-0">PO #{order.id}</h3>
        <button className="btn btn-sm btn-success ms-3" onClick={receive} disabled={receiving || order.status === 'received'}>
          Receive
        </button>
      </div>
      <form className="row g-2 mb-3" onSubmit={addItem}>
        <div className="col-md-5">
          <select className="form-select" value={form.ingredient_id} onChange={(e)=>setForm(f=>({...f,ingredient_id:e.target.value}))} required>
            <option value="">Add ingredient…</option>
            {(ingredients||[]).map(ing => (
              <option key={ing.id} value={ing.id}>{ing.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <input className="form-control" placeholder="Qty" type="number" step="any" value={form.quantity} onChange={(e)=>setForm(f=>({...f,quantity:e.target.value}))} required />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={form.unit_id} onChange={(e)=>setForm(f=>({...f,unit_id:e.target.value}))}>
            <option value="">(unit)</option>
            {(units||[]).map(u => <option key={u.id} value={u.id}>{u.abbreviation||u.name}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100">Add</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Qty</th>
              <th>Unit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(items||[]).map(it => (
              <ItemRow key={it.id} poId={order.id} item={it} units={units} onDeleted={()=>delItem(it.id)} onSaved={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemRow({ poId, item, units, onDeleted, onSaved }) {
  const [qty, setQty] = React.useState(item.quantity);
  const [unitId, setUnitId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    setQty(item.quantity);
    setUnitId('');
  }, [item.id]);
  const save = async () => {
    setSaving(true);
    try {
      const body = new URLSearchParams();
      if (qty != null) body.append('quantity', String(qty));
      if (unitId) body.append('unit_id', String(unitId));
      const res = await fetch(`/api/admin/purchase-orders/${poId}/items/${item.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
      });
      if (!res.ok) throw new Error('Save failed');
      await onSaved();
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };
  return (
    <tr>
      <td>{item.ingredient_name}</td>
      <td style={{minWidth:'140px'}}>
        <input type="number" step="any" className="form-control form-control-sm" value={qty}
               onChange={(e)=>setQty(e.target.value)} />
      </td>
      <td style={{minWidth:'140px'}}>
        <select className="form-select form-select-sm" value={unitId}
                onChange={(e)=>setUnitId(e.target.value)}>
          <option value="">{item.unit || '(unit)'}</option>
          {(units||[]).map(u => <option key={u.id} value={u.id}>{u.abbreviation||u.name}</option>)}
        </select>
      </td>
      <td>
        <button className="btn btn-sm btn-outline-primary me-2" disabled={saving} onClick={save}>Save</button>
        <button className="btn btn-sm btn-outline-danger" onClick={onDeleted}>Delete</button>
      </td>
    </tr>
  );
}
