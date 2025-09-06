import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useConfirm } from '@/contexts/ConfirmContext.jsx';

export default function LocationsRoute() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ id: '', name: '' });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      setLocations(json.locations || []);
    } catch (e) {
      setError('Failed to load locations');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = new URLSearchParams();
      if (form.id) body.append('id', form.id);
      body.append('name', form.name || '');
      const res = await fetch('/api/admin/locations', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      await load(); setForm({ id: '', name: '' });
      push(res.ok ? (form.id ? 'Location updated' : 'Location added') : 'Failed to save location', { variant: res.ok ? 'success' : 'danger' });
    } catch { push('Failed to save location', { variant: 'danger' }); }
  };

  const del = async (id) => {
    const ok = await confirm('Remove this location?', { title: 'Remove location', confirmText: 'Remove', variant: 'danger' });
    if (!ok) return;
    const body = new URLSearchParams(); body.append('id', id);
    const res = await fetch('/api/admin/locations/delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    await load(); push(res.ok ? 'Location deleted' : 'Failed to delete location', { variant: res.ok ? 'success' : 'danger' });
  };

  if (loading) return <div>Loading…</div>;
  return (
    <div className="admin-section">
      <h3 className="mb-3">Locations</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form className="row g-2 mb-3" onSubmit={save}>
        <div className="col-md-4">
          <input className={`form-control ${(form.name!==undefined && !String(form.name).trim()) ? 'is-invalid' : ''}`} placeholder="Location name" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} required />
          {(form.name!==undefined && !String(form.name).trim()) && <div className="invalid-feedback">Name is required</div>}
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100">{form.id ? 'Update' : 'Add'}</button>
        </div>
        <div className="col-md-2">
          {form.id && <button type="button" className="btn btn-secondary w-100" onClick={()=>setForm({ id:'', name:'' })}>Cancel</button>}
        </div>
      </form>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead><tr><th>Name</th><th className="text-end"></th></tr></thead>
          <tbody>
            {locations.map((l)=>(
              <tr key={l.id}>
                <td>{l.name}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>setForm({ id: l.id, name: l.name||'' })}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>del(l.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!locations.length && <tr><td colSpan={2} className="text-muted">No locations</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

