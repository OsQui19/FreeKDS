import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext.jsx';

export default function SuppliersRoute() {
  const { push } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ id: '', name: '', contact_info: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (e) {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = new URLSearchParams();
      if (form.id) body.append('id', form.id);
      body.append('name', form.name);
      if (form.contact_info) body.append('contact_info', form.contact_info);
      const res = await fetch('/api/admin/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      setForm({ id: '', name: '', contact_info: '' });
      await load();
      push(res.ok ? (form.id ? 'Supplier updated' : 'Supplier added') : 'Failed to save supplier', { variant: res.ok ? 'success' : 'danger' });
    } catch {
      setError('Save failed');
    }
  };

  const del = async (id) => {
    const body = new URLSearchParams();
    body.append('id', id);
    const res = await fetch('/api/admin/suppliers/delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    await load();
    push(res.ok ? 'Supplier deleted' : 'Failed to delete supplier', { variant: res.ok ? 'success' : 'danger' });
  };

  const startEdit = (s) => setForm({ id: s.id, name: s.name || '', contact_info: s.contact_info || '' });

  if (loading) return <div>Loading…</div>;
  return (
    <div className="admin-section">
      <h3 className="mb-3">Suppliers</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form className="row g-2 mb-3" onSubmit={save}>
        <div className="col-md-3">
          <input className={`form-control ${(form.name!==undefined && !String(form.name).trim()) ? 'is-invalid' : ''}`} placeholder="Name" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} required />
          {(form.name!==undefined && !String(form.name).trim()) && <div className="invalid-feedback">Name is required</div>}
        </div>
        <div className="col-md-4">
          <input className="form-control" placeholder="Contact info" value={form.contact_info} onChange={(e)=>setForm(f=>({...f,contact_info:e.target.value}))} />
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100">{form.id ? 'Update' : 'Add'}</button>
        </div>
        <div className="col-md-2">
          {form.id && (
            <button type="button" className="btn btn-secondary w-100" onClick={()=>setForm({ id:'', name:'', contact_info:'' })}>Cancel</button>
          )}
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s)=> (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.contact_info || '-'}</td>
                <td>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>startEdit(s)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>del(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
