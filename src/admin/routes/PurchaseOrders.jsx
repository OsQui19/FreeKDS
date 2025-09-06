import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useConfirm } from '@/contexts/ConfirmContext.jsx';
import { formatDate } from '@/utils/format.js';
import { Link, useNavigate } from 'react-router-dom';

export default function PurchaseOrdersRoute() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ order_date: '', supplier_id: '', location_id: '' });
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      setOrders(json.orders || []);
      setSuppliers(json.suppliers || []);
      setLocations(json.locations || []);
    } catch (e) {
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    const body = new URLSearchParams();
    body.append('order_date', form.order_date);
    body.append('supplier_id', form.supplier_id);
    if (form.location_id) body.append('location_id', form.location_id);
    const res = await fetch('/api/admin/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, redirect: 'follow' });
    await load();
    if (res.ok) push('Purchase order created'); else push('Failed to create purchase order', { variant: 'danger' });
  };

  const del = async (id) => {
    const ok = await confirm('Delete this purchase order?', { title: 'Delete purchase order', confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;
    const body = new URLSearchParams();
    body.append('id', id);
    const res = await fetch('/api/admin/purchase-orders/delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    await load();
    push(res.ok ? 'Purchase order deleted' : 'Failed to delete purchase order', { variant: res.ok ? 'success' : 'danger' });
  };

  if (loading) return <div>Loading…</div>;
  return (
    <div className="admin-section">
      <h3 className="mb-3">Purchase Orders</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form className="row g-2 mb-3" onSubmit={create}>
        <div className="col-md-3">
          <label className="form-label small">Order Date</label>
          <input type="date" className="form-control" value={form.order_date} onChange={(e)=>setForm(f=>({...f,order_date:e.target.value}))} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Supplier</label>
          <select className="form-select" value={form.supplier_id} onChange={(e)=>setForm(f=>({...f,supplier_id:e.target.value}))} required>
            <option value="">Select…</option>
            {suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small">Location</label>
          <select className="form-select" value={form.location_id} onChange={(e)=>setForm(f=>({...f,location_id:e.target.value}))}>
            <option value="">(optional)</option>
            {locations.map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button className="btn btn-primary w-100">Create</button>
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Location</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o=> (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{formatDate(o.order_date)}</td>
                <td>{o.supplier_name}</td>
                <td>{o.location_name || '-'}</td>
                <td>{o.status || '-'}</td>
                <td>
                  <Link className="btn btn-sm btn-outline-primary me-2" to={`/admin/purchase-orders/${o.id}`}>View</Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>del(o.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
