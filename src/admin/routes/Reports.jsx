import React, { useEffect, useState } from 'react';
import Loading from '@/components/Loading.jsx';

export default function ReportsRoute() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [minutes, setMinutes] = useState(60);
  const [warn, setWarn] = useState(7);
  const [crit, setCrit] = useState(12);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ minutes: String(minutes), warn: String(warn), crit: String(crit) });
      const res = await fetch(`/api/reports/kitchen?${qs}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="admin-section">
      <div className="d-flex align-items-center mb-3">
        <h3 className="m-0">Kitchen Metrics</h3>
        <div className="ms-3 d-flex align-items-end gap-2">
          <div>
            <label className="form-label small">Window (min)</label>
            <input type="number" className="form-control form-control-sm" value={minutes} onChange={(e)=>setMinutes(e.target.value)} />
          </div>
          <div>
            <label className="form-label small">Warn (min)</label>
            <input type="number" className="form-control form-control-sm" value={warn} onChange={(e)=>setWarn(e.target.value)} />
          </div>
          <div>
            <label className="form-label small">Critical (min)</label>
            <input type="number" className="form-control form-control-sm" value={crit} onChange={(e)=>setCrit(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-outline-primary" onClick={load}>Refresh</button>
        </div>
      </div>
      {loading && <Loading />}
      {error && <div className="alert alert-danger">{error}</div>}
      {data && (
        <div className="admin-grid">
          <div className="card-surface p-3">
            <div className="small text-muted">Active Orders</div>
            <div className="fs-3 fw-bold">{data.active}</div>
          </div>
          <div className="card-surface p-3">
            <div className="small text-muted">Completed (last {minutes}m)</div>
            <div className="fs-3 fw-bold">{data.completed}</div>
          </div>
          <div className="card-surface p-3">
            <div className="small text-muted">Avg Prep Time</div>
            <div className="fs-3 fw-bold">{Math.round(data.avg_prep_seconds / 60)}m {data.avg_prep_seconds % 60}s</div>
          </div>
          <div className="card-surface p-3">
            <div className="small text-muted">On Time</div>
            <div className="fs-3 fw-bold text-success">{data.on_time}</div>
          </div>
          <div className="card-surface p-3">
            <div className="small text-muted">Warn</div>
            <div className="fs-3 fw-bold text-warning">{data.warn}</div>
          </div>
          <div className="card-surface p-3">
            <div className="small text-muted">Critical</div>
            <div className="fs-3 fw-bold text-danger">{data.critical}</div>
          </div>
        </div>
      )}
    </div>
  );
}

