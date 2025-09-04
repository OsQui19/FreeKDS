import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import KdsApp from './KdsApp.jsx';
import useTransport from '@/hooks/useTransport.js';

export default function StationScreen() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/station/${id}`);
        if (!res.ok) throw new Error('Failed to load station');
        const json = await res.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e.message || 'Error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, [id]);

  const { send } = useTransport({ type: 'ws', fallback: 'sse', stationId: Number(id) });

  if (loading) return <div className="u-center-screen">Loading…</div>;
  if (error) return <div className="u-center-screen alert alert-danger">{error}</div>;
  if (!data) return null;
  return (
    <div className={`container-fluid ${compact ? 'kds-compact' : ''}`}>
      <div className="d-flex align-items-center justify-content-between py-2">
        <h5 className="m-0">{data.station?.name}</h5>
        <div className="d-flex align-items-center gap-2">
          <label className="small mb-0">Compact</label>
          <input type="checkbox" className="form-check-input" checked={compact} onChange={(e)=>setCompact(e.target.checked)} />
          <div className="text-muted small">{new Date().toLocaleTimeString()}</div>
        </div>
      </div>
      <KdsApp stationType={data.station?.type} stationId={data.station?.id} transport="ws" fallback="sse" />
      {data.station?.type === 'expo' && (
        <div className="admin-section mt-3">
          <h6 className="mb-2">Bumped Orders</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead><tr><th>Order #</th><th>Bumped At</th><th></th></tr></thead>
              <tbody>
                {(data.bumpedOrders||[]).map(bo => (
                  <tr key={bo.order_id}>
                    <td>{bo.order_number || bo.order_id}</td>
                    <td>{bo.bumped_at ? new Date(bo.bumped_at).toLocaleTimeString() : '-'}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-warning" onClick={() => send('recallOrder', { orderId: bo.order_id })}>Recall</button>
                    </td>
                  </tr>
                ))}
                {!data.bumpedOrders?.length && <tr><td colSpan={3} className="text-muted">No bumped orders</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
