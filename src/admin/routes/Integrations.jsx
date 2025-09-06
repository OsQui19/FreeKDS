import React, { useEffect, useState } from 'react';

export default function IntegrationsRoute() {
  const [tokens, setTokens] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [error, setError] = useState(null);
  const [scopes, setScopes] = useState({ 'orders:write': true, 'orders:read': true, 'kds:read': true });
  const [name, setName] = useState('Integration');
  const [stationId, setStationId] = useState('');

  const load = async () => {
    try {
      const [tRes, dRes] = await Promise.all([
        fetch('/api/api-tokens'),
        fetch('/api/webhooks/deliveries')
      ]);
      const t = tRes.ok ? await tRes.json() : { tokens: [] };
      const d = dRes.ok ? await dRes.json() : { deliveries: [] };
      setTokens(t.tokens || []);
      setDeliveries(d.deliveries || []);
    } catch (e) {
      setError('Failed to load');
    }
  };
  useEffect(() => { load(); }, []);

  const issue = async () => {
    try {
      const body = { name, scopes: Object.entries(scopes).filter(([,v])=>v).map(([k])=>k) };
      if (stationId) body.station_id = parseInt(stationId, 10);
      const res = await fetch('/api/api-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to issue');
      await load();
      alert(`Token created. Copy now:\n${j.token}`);
    } catch (e) {
      alert(e.message || 'Failed to issue');
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this token?')) return;
    await fetch(`/api/api-tokens/${id}`, { method: 'DELETE' });
    await load();
  };

  const resend = async (id) => {
    await fetch(`/api/webhooks/resend/${id}`, { method: 'POST' });
    await load();
  };

  return (
    <div className="admin-section">
      <h3 className="mb-3">Integrations</h3>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-4">
        <h5>API Tokens</h5>
        <div className="row g-2 align-items-end mb-2">
          <div className="col-md-3">
            <label className="form-label small">Name</label>
            <input className="form-control" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label small">Station (optional)</label>
            <input className="form-control" value={stationId} onChange={(e)=>setStationId(e.target.value)} placeholder="Station ID" />
          </div>
          <div className="col-md-6">
            <label className="form-label small d-block">Scopes</label>
            {['orders:write','orders:read','kds:read','tokens:write'].map((s)=>(
              <label key={s} className="me-3">
                <input type="checkbox" className="form-check-input me-1" checked={!!scopes[s]} onChange={(e)=> setScopes((prev)=> ({...prev, [s]: e.target.checked}))} />{s}
              </label>
            ))}
          </div>
          <div className="col-12 text-end">
            <button className="btn btn-primary" onClick={issue}>Issue Token</button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead><tr><th>Name</th><th>Token ID</th><th>Scopes</th><th>Station</th><th>Last Used</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="small text-muted">{t.token_id}</td>
                  <td className="small">{(() => { try { return (JSON.parse(t.scopes||'[]')||[]).join(', ');} catch { return ''; } })()}</td>
                  <td>{t.station_id || '—'}</td>
                  <td>{t.last_used ? new Date(t.last_used).toLocaleString() : '—'}</td>
                  <td>{t.revoked ? 'Revoked' : (t.expires_at && new Date(t.expires_at) < new Date()) ? 'Expired' : 'Active'}</td>
                  <td className="text-end"><button className="btn btn-sm btn-outline-danger" onClick={()=>revoke(t.id)} disabled={t.revoked}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h5>Outbound Webhooks</h5>
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead><tr><th>ID</th><th>Event</th><th>Status</th><th>Latency</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {deliveries.map((d)=>(
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.event}</td>
                  <td>{d.status_code ?? 'ERR'}</td>
                  <td>{d.response_ms ?? '-'}</td>
                  <td>{new Date(d.created_at).toLocaleString()}</td>
                  <td className="text-end"><button className="btn btn-sm btn-outline-secondary" onClick={()=>resend(d.id)}>Resend</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-muted small">Configure URL and secret in Settings → Webhooks.</div>
      </div>

      <div className="mt-4">
        <h5>Inbound Orders (Docs)</h5>
        <p className="text-muted small">Send orders to <code>/api/incoming/orders</code> with an API token that has scope <code>orders:write</code>.</p>
        <pre className="small" style={{whiteSpace:'pre-wrap'}}>
{`curl -X POST https://your-host/api/incoming/orders \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "order_number":"123",
    "order_type":"TO-GO",
    "items":[{"menu_item_id":1,"quantity":2}]
  }'`}
        </pre>
      </div>
    </div>
  );
}

