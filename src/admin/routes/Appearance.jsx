import React, { useEffect, useState } from 'react';

export default function AppearanceRoute() {
  const [tokenPresets, setTokenPresets] = useState([]);
  const [layoutPresets, setLayoutPresets] = useState([]);
  const [scope, setScope] = useState('global');
  const [stationId, setStationId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [page, setPage] = useState('pos');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const [t, l] = await Promise.all([
        fetch('/api/presets/tokens'),
        fetch('/api/presets/layouts'),
      ]);
      const tj = await t.json();
      const lj = await l.json();
      setTokenPresets(tj.presets || []);
      setLayoutPresets(lj.presets || []);
    } catch (e) {
      setErr('Failed to load presets');
    }
  };
  useEffect(() => { load(); }, []);

  const applyToken = async (name) => {
    setMsg(null); setErr(null);
    try {
      const body = { name, scope };
      if (scope === 'station') body.stationId = stationId || undefined;
      if (scope === 'screen') body.screenId = screenId || undefined;
      const res = await fetch('/api/presets/tokens/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Apply failed');
      setMsg('Token preset applied');
    } catch (e) {
      setErr(e.message || 'Apply failed');
    }
  };

  const applyLayout = async (name) => {
    setMsg(null); setErr(null);
    try {
      const res = await fetch('/api/presets/layouts/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, page }) });
      if (!res.ok) throw new Error('Apply failed');
      setMsg('Layout preset applied');
    } catch (e) {
      setErr(e.message || 'Apply failed');
    }
  };

  return (
    <div className="admin-section">
      <h3 className="mb-3">Appearance Presets</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="mb-4">
        <h5>Token Presets</h5>
        <div className="row g-2 align-items-end mb-2">
          <div className="col-md-3">
            <label className="form-label small">Scope</label>
            <select className="form-select" value={scope} onChange={(e)=>setScope(e.target.value)}>
              <option value="global">Global</option>
              <option value="station">Station</option>
              <option value="screen">Screen</option>
            </select>
          </div>
          {scope === 'station' && (
            <div className="col-md-3">
              <label className="form-label small">Station ID</label>
              <input className="form-control" value={stationId} onChange={(e)=>setStationId(e.target.value)} />
            </div>
          )}
          {scope === 'screen' && (
            <div className="col-md-3">
              <label className="form-label small">Screen ID</label>
              <input className="form-control" value={screenId} onChange={(e)=>setScreenId(e.target.value)} />
            </div>
          )}
        </div>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead><tr><th>Name</th><th></th></tr></thead>
            <tbody>
              {tokenPresets.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={()=>applyToken(p.name)}>Apply</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h5>Layout Presets</h5>
        <div className="row g-2 align-items-end mb-2">
          <div className="col-md-3">
            <label className="form-label small">Page</label>
            <select className="form-select" value={page} onChange={(e)=>setPage(e.target.value)}>
              <option value="pos">POS</option>
              <option value="kds-prep">KDS Prep</option>
              <option value="kds-expo">KDS Expo</option>
            </select>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead><tr><th>Name</th><th>Page</th><th></th></tr></thead>
            <tbody>
              {layoutPresets.map((p)=>(
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.page}</td>
                  <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={()=>applyLayout(p.name)}>Apply</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

