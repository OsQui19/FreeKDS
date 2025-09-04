import React, { useEffect, useMemo, useState } from 'react';

function Section({ title, children, action }) {
  return (
    <div className="admin-section mb-3">
      <div className="d-flex align-items-center mb-2">
        <h5 className="m-0">{title}</h5>
        {action && <div className="ms-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

export default function StationsRoute() {
  const [stations, setStations] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingPrinter, setEditingPrinter] = useState(null); // id or 'new'
  const [creatingToken, setCreatingToken] = useState(false);
  const [issuedToken, setIssuedToken] = useState('');
  const [stationForm, setStationForm] = useState({ id: '', name: '', type: 'prep', order_type_filter: '', bg_color: '', primary_color: '', font_family: '' });
  const [editingStationId, setEditingStationId] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [dev, tok, admin] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/api-tokens'),
        fetch('/api/admin'),
      ]);
      if (!dev.ok) throw new Error('Failed to load devices');
      const devJson = await dev.json();
      setStations(devJson.stations || []);
      setPrinters(devJson.printers || []);
      const tokJson = tok.ok ? await tok.json() : { tokens: [] };
      const adminJson = admin.ok ? await admin.json() : {};
      setTokens(tokJson.tokens || []);
      setCategories(adminJson.categories || []);
    } catch (e) {
      setError(e.message || 'Error');
    }
  };
  useEffect(() => { load(); }, []);

  const editStation = async (s) => {
    setEditingStationId(s.id);
    setStationForm({
      id: s.id,
      name: s.name || '',
      type: s.type || 'prep',
      order_type_filter: s.order_type_filter || '',
      bg_color: s.bg_color || '',
      primary_color: s.primary_color || '',
      font_family: s.font_family || '',
    });
    // Load category mapping
    try {
      const res = await fetch(`/api/admin/station-categories?station_id=${s.id}`);
      const json = await res.json();
      setStationForm((f)=> ({ ...f, category_ids: json.category_ids || [] }));
    } catch {}
  };
  const resetStation = () => { setEditingStationId(null); setStationForm({ id: '', name: '', type: 'prep', order_type_filter: '', bg_color: '', primary_color: '', font_family: '' }); };
  const saveStation = async (e) => {
    e.preventDefault(); setError(null); setMessage(null);
    if (!stationForm.name?.trim()) { setError('Station name is required'); return; }
    const body = new URLSearchParams();
    Object.entries(stationForm).forEach(([k,v]) => { if (v !== '' && v != null) body.append(k, String(v)); });
    const res = await fetch('/api/admin/stations', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!res.ok) { setError('Failed to save station'); return; }
    const saved = await res.json().catch(() => ({}));
    // Save category mapping if provided
    if (stationForm.category_ids && saved.id) {
      const b2 = new URLSearchParams();
      b2.append('station_id', String(saved.id));
      (stationForm.category_ids || []).forEach((cid) => b2.append('category_ids', String(cid)));
      await fetch('/api/admin/station-categories', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: b2 });
    }
    resetStation(); await load(); setMessage('Station saved');
  };
  const deleteStation = async (id) => {
    if (!window.confirm('Delete this station?')) return;
    const res = await fetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
    if (res.ok) { await load(); setMessage('Station deleted'); }
  };

  const savePrinter = async (payload, id) => {
    try {
      setError(null); setMessage(null);
      const res = await fetch('/api/printers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id }) });
      if (!res.ok) throw new Error('Save failed');
      setMessage('Printer saved');
      setEditingPrinter(null);
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  const deletePrinter = async (id) => {
    if (!window.confirm('Delete this printer?')) return;
    try {
      const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMessage('Printer deleted');
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  const createToken = async (form) => {
    setCreatingToken(true); setError(null); setMessage(null); setIssuedToken('');
    try {
      const res = await fetch('/api/api-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        let msg = 'Failed to create token';
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      setIssuedToken(json.token || '');
      setMessage('Token created');
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setCreatingToken(false);
    }
  };

  const revokeToken = async (id) => {
    if (!window.confirm('Revoke this token?')) return;
    try {
      const res = await fetch(`/api/api-tokens/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Revoke failed');
      setMessage('Token revoked');
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  };

  const PrinterRow = ({ p }) => (
    <tr>
      <td>{p.name}</td>
      <td>{p.type}</td>
      <td>{p.address}</td>
      <td>{p.profile}</td>
      <td>{p.station_id || '—'}</td>
      <td className="text-end">
        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => setEditingPrinter(p.id)}>Edit</button>
        <button className="btn btn-sm btn-outline-danger" onClick={() => deletePrinter(p.id)}>Delete</button>
      </td>
    </tr>
  );

  const PrinterEditor = ({ initial = {}, id }) => {
    const [name, setName] = useState(initial.name || '');
    const [type, setType] = useState(initial.type || 'network');
    const [address, setAddress] = useState(initial.address || '');
    const [profile, setProfile] = useState(initial.profile || '80mm');
    const [stationId, setStationId] = useState(initial.station_id || '');
    const [isEnabled, setIsEnabled] = useState(initial.is_enabled ? true : false);
    const submit = (e) => {
      e.preventDefault();
      if (!name || !address) return setError('Name and address required');
      savePrinter({ name, type, address, profile, station_id: stationId || null, is_enabled: isEnabled }, id);
    };
    return (
      <tr>
        <td><input className="form-control form-control-sm" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Host printer" /></td>
        <td>
          <select className="form-select form-select-sm" value={type} onChange={(e)=>setType(e.target.value)}>
            <option value="network">Network</option>
            <option value="usb">USB</option>
          </select>
        </td>
        <td><input className="form-control form-control-sm" value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="IP:9100 or device path" /></td>
        <td>
          <select className="form-select form-select-sm" value={profile} onChange={(e)=>setProfile(e.target.value)}>
            <option value="80mm">80mm</option>
            <option value="58mm">58mm</option>
          </select>
        </td>
        <td>
          <select className="form-select form-select-sm" value={stationId || ''} onChange={(e)=>setStationId(e.target.value || '')}>
            <option value="">Any</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </td>
        <td className="text-end">
          <div className="form-check form-switch d-inline-block me-2">
            <input className="form-check-input" type="checkbox" checked={isEnabled} onChange={(e)=>setIsEnabled(e.target.checked)} />
          </div>
          <button className="btn btn-sm btn-primary me-2" onClick={submit}>Save</button>
          <button className="btn btn-sm btn-secondary" onClick={()=>setEditingPrinter(null)}>Cancel</button>
        </td>
      </tr>
    );
  };

  return (
    <div className="admin-section">
      <h3 className="mb-3">Stations & Devices</h3>
      {error && <div className="alert alert-danger py-1">{error}</div>}
      {message && <div className="toast show position-fixed bottom-0 end-0 m-3 text-bg-success"><div className="toast-body">{message}</div></div>}

      <Section title="Stations" action={<button className="btn btn-sm btn-outline-primary" onClick={()=>{ resetStation(); setEditingStationId('new'); }}>Add Station</button>}>
        {(editingStationId !== null) && (
          <form className="row g-2 mb-3" onSubmit={saveStation}>
            <div className="col-md-3">
              <label className="form-label small">Name</label>
              <input className="form-control form-control-sm" value={stationForm.name} onChange={(e)=>setStationForm(f=>({...f,name:e.target.value}))} required />
            </div>
            <div className="col-md-2">
              <label className="form-label small">Type</label>
              <select className="form-select form-select-sm" value={stationForm.type} onChange={(e)=>setStationForm(f=>({...f,type:e.target.value}))}>
                <option value="prep">prep</option>
                <option value="expo">expo</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Order Type Filter</label>
              <input className="form-control form-control-sm" placeholder="ALL / DINE-IN / TO-GO" value={stationForm.order_type_filter} onChange={(e)=>setStationForm(f=>({...f,order_type_filter:e.target.value}))} />
            </div>
            <div className="col-md-2">
              <label className="form-label small">BG Color</label>
              <input className="form-control form-control-sm" value={stationForm.bg_color} onChange={(e)=>setStationForm(f=>({...f,bg_color:e.target.value}))} />
            </div>
            <div className="col-md-2">
              <label className="form-label small">Primary</label>
              <input className="form-control form-control-sm" value={stationForm.primary_color} onChange={(e)=>setStationForm(f=>({...f,primary_color:e.target.value}))} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Font</label>
              <input className="form-control form-control-sm" value={stationForm.font_family} onChange={(e)=>setStationForm(f=>({...f,font_family:e.target.value}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label small">Visible Categories</label>
              <select multiple className="form-select form-select-sm" value={stationForm.category_ids || []} onChange={(e)=>setStationForm(f=>({...f,category_ids: Array.from(e.target.selectedOptions).map(o=>o.value)}))}>
                {(categories||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-3 ms-auto d-flex justify-content-end align-items-end gap-2">
              <button className="btn btn-sm btn-primary">Save</button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={resetStation}>Cancel</button>
            </div>
          </form>
        )}
        <div className="table-responsive">
          <table className="table table-sm">
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Order Filter</th><th></th></tr></thead>
            <tbody>
              {stations.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.type}</td>
                  <td>{s.order_type_filter || 'ALL'}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>editStation(s)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteStation(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!stations.length && <tr><td colSpan={4}>No stations found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="API Tokens" action={<button className="btn btn-sm btn-outline-primary" onClick={()=>setCreatingToken(true)}>Create Token</button>}>
        {creatingToken && (
          <form className="row g-2 mb-3" onSubmit={(e)=>{e.preventDefault(); const f=new FormData(e.currentTarget); createToken({ name: f.get('name') || 'Device', station_id: f.get('station_id') ? parseInt(f.get('station_id'),10): null, scopes: (f.get('scopes')||'').split(',').map(s=>s.trim()).filter(Boolean) }); }}>
            <div className="col-md-3"><input name="name" className="form-control form-control-sm" placeholder="Token name" /></div>
            <div className="col-md-3">
              <select name="station_id" className="form-select form-select-sm" defaultValue="">
                <option value="">No station</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-md-4"><input name="scopes" className="form-control form-control-sm" placeholder="Scopes (comma-separated)" /></div>
            <div className="col-md-2 text-end"><button className="btn btn-sm btn-primary" type="submit">Issue</button></div>
          </form>
        )}
        {issuedToken && (
          <div className="alert alert-warning py-1">Copy this token now (shown once): <code>{issuedToken}</code></div>
        )}
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead><tr><th>Name</th><th>Token ID</th><th>Station</th><th>Scopes</th><th>Last Used</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="small text-muted">{t.token_id}</td>
                  <td>{t.station_id || '—'}</td>
                  <td className="small">{(() => { try { return (JSON.parse(t.scopes||'[]')||[]).join(', ');} catch { return ''; } })()}</td>
                  <td>{t.last_used ? new Date(t.last_used).toLocaleString() : '—'}</td>
                  <td>{t.revoked ? 'Revoked' : (t.expires_at && new Date(t.expires_at) < new Date()) ? 'Expired' : 'Active'}</td>
                  <td className="text-end"><button className="btn btn-sm btn-outline-danger" onClick={()=>revokeToken(t.id)} disabled={t.revoked}>Revoke</button></td>
                </tr>
              ))}
              {!tokens.length && <tr><td colSpan={7}>No tokens.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Printers" action={<button className="btn btn-sm btn-outline-primary" onClick={()=>setEditingPrinter('new')}>Add Printer</button>}>
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead><tr><th>Name</th><th>Type</th><th>Address</th><th>Profile</th><th>Station</th><th className="text-end"></th></tr></thead>
            <tbody>
              {editingPrinter === 'new' && <PrinterEditor id={null} />}
              {printers.map((p) => (editingPrinter === p.id ? <PrinterEditor key={p.id} id={p.id} initial={p} /> : <PrinterRow key={p.id} p={p} />))}
              {!printers.length && editingPrinter !== 'new' && <tr><td colSpan={6}>No printers configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
