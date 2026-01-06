import React, { useEffect, useState } from 'react';
import Loading from '@/components/Loading.jsx';
import SectionHeader from '@/components/SectionHeader.jsx';
import { SimpleLineChart, SimpleBarChart } from '@/admin/components/Charts.jsx';
import { formatCurrency } from '@/utils/format.js';

export default function ReportsRoute() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [minutes, setMinutes] = useState(60);
  const [warn, setWarn] = useState(7);
  const [crit, setCrit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [sales, setSales] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [catSales, setCatSales] = useState([]);
  const [stationTimes, setStationTimes] = useState([]);

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

  const loadAnalytics = async () => {
    try {
      const qs = new URLSearchParams({ ...(start?{start}:{}) , ...(end?{end}:{}) });
      const [sRes, tRes, cRes, stRes] = await Promise.all([
        fetch(`/api/analytics/sales?${qs}`),
        fetch(`/api/analytics/top-items?${qs}`),
        fetch(`/api/analytics/category-sales?${qs}`),
        fetch(`/api/analytics/station-bump-times?${qs}`),
      ]);
      const s = sRes.ok ? await sRes.json() : { rows: [] };
      const t = tRes.ok ? await tRes.json() : { rows: [] };
      const c = cRes.ok ? await cRes.json() : { rows: [] };
      const st = stRes.ok ? await stRes.json() : { rows: [] };
      setSales(s.rows || []);
      setTopItems(t.rows || []);
      setCatSales(c.rows || []);
      setStationTimes(st.rows || []);
    } catch {}
  };
  useEffect(() => { loadAnalytics(); }, []);

  return (
    <div className="admin-section">
      <SectionHeader
        title="Kitchen Metrics"
        actions={(
          <div className="d-flex align-items-end gap-2">
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
        )}
      />
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
      <div className="d-flex align-items-center mt-4 mb-2">
        <h3 className="m-0">Analytics</h3>
        <div className="ms-3 d-flex align-items-end gap-2">
          <div>
            <label className="form-label small">Start</label>
            <input type="date" className="form-control form-control-sm" value={start} onChange={(e)=>setStart(e.target.value)} />
          </div>
          <div>
            <label className="form-label small">End</label>
            <input type="date" className="form-control form-control-sm" value={end} onChange={(e)=>setEnd(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-outline-primary" onClick={loadAnalytics}>Reload</button>
        </div>
      </div>
      <div className="admin-grid">
        <div className="card-surface p-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="small text-muted">Sales Over Time</div>
            <div className="small fw-bold">{formatCurrency((sales||[]).reduce((s,r)=> s + (r.total||0),0))}</div>
          </div>
          <SimpleLineChart data={(sales||[]).map((r)=>({ x: r.date, y: r.total }))} xKey="x" yKey="y" height={180} />
        </div>
        <div className="card-surface p-3">
          <div className="small text-muted">Top Items</div>
          <SimpleBarChart data={(topItems||[]).map((r,i)=>({ x: i, y: r.revenue }))} xKey="x" yKey="y" height={180} />
          <div className="table-responsive mt-2">
            <table className="table table-sm">
              <thead><tr><th>Item</th><th className="text-end">Qty</th><th className="text-end">Revenue</th></tr></thead>
              <tbody>
                {(topItems||[]).map((r,i)=> (
                  <tr key={i}><td>{r.name}</td><td className="text-end">{r.qty}</td><td className="text-end">{formatCurrency(r.revenue)}</td></tr>
                ))}
                {(!topItems || !topItems.length) && <tr><td colSpan={3} className="text-muted">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-surface p-3">
          <div className="small text-muted">Category Sales</div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Category</th><th className="text-end">Total</th></tr></thead>
              <tbody>
                {(catSales||[]).map((r,i)=> (<tr key={i}><td>{r.name}</td><td className="text-end">{formatCurrency(r.total)}</td></tr>))}
                {(!catSales || !catSales.length) && <tr><td colSpan={2} className="text-muted">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-surface p-3">
          <div className="small text-muted">Station Avg Bump Time</div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Station</th><th className="text-end">Avg time (s)</th></tr></thead>
              <tbody>
                {(stationTimes||[]).map((r,i)=> (<tr key={i}><td>{r.name}</td><td className="text-end">{Math.round(r.avg_seconds)}</td></tr>))}
                {(!stationTimes || !stationTimes.length) && <tr><td colSpan={2} className="text-muted">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
