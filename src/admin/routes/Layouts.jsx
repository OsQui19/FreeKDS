import React, { useState } from 'react';
import { LayoutProvider } from '@/contexts/LayoutContext.jsx';
import Builder from '@/features/LayoutBuilder/Builder.jsx';

export default function LayoutsRoute() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/layout/versions?name=default');
      const json = await res.json();
      setVersions(json.versions || []);
    } catch {}
    setLoading(false);
  };

  const renderControls = ({ serialize, saveDraft }) => (
    <div className="d-flex align-items-center mb-3 gap-2">
      <button className="btn btn-outline-secondary" onClick={() => saveDraft()}>Save Draft</button>
      <button
        className="btn btn-primary"
        onClick={async () => {
          setStatus(null); setError(null);
          try {
            const layout = serialize();
            const res = await fetch('/api/layout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ layout, name: 'default' }),
            });
            if (!res.ok) throw new Error('Publish failed');
            setStatus('Published');
          } catch (e) {
            setError(e.message || 'Publish failed');
          }
        }}
      >
        Publish
      </button>
      <button className="btn btn-outline-secondary" onClick={loadVersions}>Versions</button>
      {status && <div className="alert alert-success py-1 mb-0">{status}</div>}
      {error && <div className="alert alert-danger py-1 mb-0">{error}</div>}
    </div>
  );

  return (
    <div className="admin-section">
      <h3 className="mb-3">Layout Builder</h3>
      <LayoutProvider name="default-draft">
        <Builder renderControls={renderControls} />
      </LayoutProvider>
      <div className="mt-3">
        <h6>Versions</h6>
        {loading && <div>Loading…</div>}
        {!loading && (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead><tr><th>ID</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td>{v.id}</td>
                    <td>{new Date(v.created_at).toLocaleString()}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={async ()=>{
                        try {
                          const res = await fetch('/api/layout/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, name: 'default' }) });
                          if (!res.ok) throw new Error('Restore failed');
                          setStatus('Restored');
                        } catch(e) { setError(e.message || 'Restore failed'); }
                      }}>Restore</button>
                    </td>
                  </tr>
                ))}
                {!versions.length && <tr><td colSpan={3} className="text-muted">No versions yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
