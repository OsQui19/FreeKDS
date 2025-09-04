import React, { useEffect, useState } from 'react';

export default function BackupsRoute() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const [ls, st] = await Promise.all([
        fetch('/api/admin/backups/list'),
        fetch('/api/admin/backups/status'),
      ]);
      const lsJson = await ls.json();
      const stJson = await st.json();
      setList(lsJson.backups || []);
      setStatus(stJson || {});
    } catch (e) {
      setError(e.message || 'Error');
    }
  };
  useEffect(() => { load(); }, []);

  // Auto-refresh while a backup is running
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [status?.running]);

  const createBackup = async () => {
    setRunning(true);
    try {
      await fetch('/api/admin/backups/create', { method: 'POST' });
      await load();
    } finally {
      setRunning(false);
    }
  };

  const del = async (file) => {
    const body = new URLSearchParams();
    body.append('file', file);
    await fetch('/api/admin/backups/delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    await load();
  };

  const restore = async () => {
    if (!selected) return;
    if (!confirm(`Restore backup ${selected}? This will overwrite current data.`)) return;
    const body = new URLSearchParams();
    body.append('file', selected);
    await fetch('/api/admin/backups/restore', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    await load();
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('backup', file);
      await fetch('/api/admin/backups/upload', { method: 'POST', body: form });
      await load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="admin-section">
      <div className="d-flex align-items-center mb-3">
        <h3 className="m-0">Backups</h3>
        <button className="btn btn-sm btn-primary ms-3" onClick={createBackup} disabled={running}>Create Backup</button>
        <button className="btn btn-sm btn-outline-secondary ms-2" onClick={load}>Refresh</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="mb-2 text-muted small">Status: {status?.running ? 'Running' : 'Idle'}</div>
      <div className="mb-3">
        <LogTail running={!!status?.running} />
      </div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <select className="form-select w-auto" value={selected} onChange={(e)=>setSelected(e.target.value)}>
          <option value="">Select backup to restore…</option>
          {list.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="btn btn-outline-warning" onClick={restore} disabled={!selected}>Restore</button>
        <label className="btn btn-outline-secondary mb-0">
          Upload<input type="file" className="d-none" onChange={upload} disabled={uploading} />
        </label>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>File</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f}>
                <td>{f}</td>
                <td>
                  <a className="btn btn-sm btn-outline-primary me-2" href={`/api/admin/backups/download?file=${encodeURIComponent(f)}`}>Download</a>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>del(f)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogTail({ running }) {
  const [log, setLog] = React.useState('');
  React.useEffect(() => {
    let mounted = true;
    const loadLog = async () => {
      try {
        const res = await fetch('/api/admin/backups/log');
        const text = await res.text();
        if (mounted) setLog(text || '');
      } catch {/* ignore */}
    };
    loadLog();
    let t;
    if (running) t = setInterval(loadLog, 2000);
    return () => { mounted = false; if (t) clearInterval(t); };
  }, [running]);
  return (
    <pre className="small" style={{ maxHeight: 160, overflow: 'auto', background: '#f8f9fa', padding: '0.5rem' }}>{log}</pre>
  );
}
