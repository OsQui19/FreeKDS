import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import KdsApp from './KdsApp.jsx';
import useTransport from '@/hooks/useTransport.js';
import useFeatureFlag from '@/hooks/useFeatureFlag.js';

export default function StationScreen() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);
  const [takeoutOnly, setTakeoutOnly] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [warnS, setWarnS] = useState(7 * 60);
  const [critS, setCritS] = useState(12 * 60);
  const [soundNew, setSoundNew] = useState('beep');
  const [soundUrgent, setSoundUrgent] = useState('beep2');
  const ffContext = React.useMemo(() => ({ station: Number(id) }), [id]);
  const { value: ffCompact } = useFeatureFlag('ui.compactModeDefault', false, ffContext);
  const { value: ffShowAllDay } = useFeatureFlag('ui.showAllDay', true, ffContext);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/station/${id}`);
        if (!res.ok) throw new Error('Failed to load station');
        const json = await res.json();
        if (active) {
          setData(json);
          const s = json.settings || {};
          const w = parseInt(s.kds_warn_minutes || 7, 10);
          const c = parseInt(s.kds_critical_minutes || 12, 10);
          setWarnS((Number.isNaN(w) ? 7 : w) * 60);
          setCritS((Number.isNaN(c) ? 12 : c) * 60);
          setSoundNew(s.kds_sound_new || 'beep');
          setSoundUrgent(s.kds_sound_urgent || 'beep2');
          // Apply KDS defaults from tokens (TokenCSSVariables fills --token-*)
          try {
            const cs = getComputedStyle(document.documentElement);
            const ss = cs.getPropertyValue('--token-kds-showSidebar').trim();
            if (ss) setShowSidebar(ss === '1' || ss.toLowerCase() === 'true');
          } catch {}
        }
      } catch (e) {
        if (active) setError(e.message || 'Error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, [id]);

  // Sync compact from feature flag when the screen loads or flag changes
  useEffect(() => {
    setCompact(!!ffCompact);
  }, [ffCompact]);

  useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty('--kds-warn-s', String(warnS));
      root.style.setProperty('--kds-crit-s', String(critS));
    } catch {}
  }, [warnS, critS]);

  // Compact toggle should influence density (used by KdsApp) and CSS vars
  useEffect(() => {
    try {
      const body = document.body;
      if (compact) body.classList.add('kds-compact');
      else body.classList.remove('kds-compact');
      return () => { body.classList.remove('kds-compact'); };
    } catch {}
  }, [compact]);

  const { send } = useTransport({ type: 'ws', fallback: 'sse', stationId: Number(id) });

  if (loading) return <div className="u-center-screen">Loading…</div>;
  if (error) return <div className="u-center-screen alert alert-danger">{error}</div>;
  if (!data) return null;
  return (
    <div className={`container-fluid ${compact ? 'kds-compact' : ''}`}>
      <div className="d-flex align-items-center justify-content-between py-2">
        <h5 className="m-0">{data.station?.name}</h5>
        <div className="text-muted small">{new Date().toLocaleTimeString()}</div>
      </div>
      <div className="d-flex align-items-center gap-3 mb-2">
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="toggleCompact" checked={compact} onChange={(e)=>setCompact(e.target.checked)} />
          <label className="form-check-label" htmlFor="toggleCompact">Compact</label>
        </div>
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="toggleTakeout" checked={takeoutOnly} onChange={(e)=>setTakeoutOnly(e.target.checked)} />
          <label className="form-check-label" htmlFor="toggleTakeout">Takeout only</label>
        </div>
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="toggleSidebar" checked={showSidebar} onChange={(e)=>setShowSidebar(e.target.checked)} />
          <label className="form-check-label" htmlFor="toggleSidebar">Summary</label>
        </div>
      </div>
      <KdsApp stationType={data.station?.type} stationId={data.station?.id} transport="ws" fallback="sse" takeoutOnly={takeoutOnly} newSound={soundNew} urgentSound={soundUrgent} showSidebar={showSidebar} bumpedOrders={data.bumpedOrders||[]} showAllDay={!!ffShowAllDay} allStations={data.allStations||[]} />
      {/* Bumped Orders list moved to modal inside KdsApp for cleaner UX */}
    </div>
  );
}
