import React from 'react';
import { updateFeatureFlags } from '@/featureFlags/index.js';

const FRIENDLY_FLAGS = [
  {
    key: 'ui.showAllDay',
    label: 'Show all‑day totals',
    type: 'boolean',
    hint: 'Display a running total of items on screen',
    defaultValue: false,
  },
  {
    key: 'ui.compactModeDefault',
    label: 'Compact tiles by default',
    type: 'boolean',
    hint: 'Use smaller tiles to fit more orders',
    defaultValue: false,
  },
  {
    key: 'transport.preferSSE',
    label: 'Prefer SSE for live updates',
    type: 'boolean',
    hint: 'Fallback transport for restricted networks',
    defaultValue: false,
  },
  {
    key: 'transport.heartbeatSeconds',
    label: 'Live update heartbeat',
    type: 'number',
    min: 5,
    max: 120,
    step: 5,
    unit: 's',
    hint: 'How often to check connection health',
    defaultValue: 30,
  },
  {
    key: 'perf.batchSize',
    label: 'Load orders in batches of',
    type: 'number',
    min: 5,
    max: 100,
    step: 5,
    defaultValue: 20,
  },
];

export default function StudioFlagsPanel({ stationId, screenId }) {
  const [flags, setFlags] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [err, setErr] = React.useState(null);

  const scope = React.useMemo(() => {
    if (screenId) return { level: 'screen', id: screenId };
    if (stationId) return { level: 'station', id: stationId };
    return { level: 'global', id: null };
  }, [stationId, screenId]);

  const friendlyValue = (fullKey) => {
    if (!flags) return undefined;
    const [ns, key] = fullKey.split('.');
    const g = flags.global?.[ns]?.[key];
    const s = scope.level !== 'global'
      ? flags[scope.level]?.[scope.id]?.[ns]?.[key]
      : undefined;
    return s !== undefined ? s : g;
  };

  const load = async () => {
    setErr(null); setMsg(null);
    try {
      const r = await fetch('/api/flags');
      const j = await r.json();
      setFlags(j);
      updateFeatureFlags(j);
    } catch (e) { setErr('Failed to load feature settings'); }
  };
  React.useEffect(() => { load(); }, []);

  const saveOne = async (fullKey, raw) => {
    setSaving(true); setErr(null); setMsg(null);
    try {
      let value = raw;
      if (typeof raw === 'string') {
        if (raw.trim() === '') value = null;
        else if (!Number.isNaN(Number(raw))) value = Number(raw);
        else if (raw === 'true' || raw === 'false') value = raw === 'true';
      }
      const [namespace, key] = fullKey.split('.');
      const body = { level: scope.level, id: scope.id, namespace, key, value };
      const res = await fetch('/api/flags', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      await load();
      setMsg('Saved');
    } catch (e) { setErr(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!flags) return <div className="card-surface p-2">Loading feature settings…</div>;

  return (
    <div className="card-surface p-2">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="small fw-bold">Feature Settings</div>
        <div className="text-muted small">Scope: {scope.level}{scope.id?` #${scope.id}`:''}</div>
      </div>
      {msg && <div className="alert alert-success py-1 mb-2">{msg}</div>}
      {err && <div className="alert alert-danger py-1 mb-2">{err}</div>}
      <div className="d-flex flex-column gap-2">
        {FRIENDLY_FLAGS.map((f) => {
          const current = friendlyValue(f.key);
          if (f.type === 'boolean') {
            return (
              <div key={f.key} className="form-check form-switch d-flex align-items-center justify-content-between">
                <div>
                  <input className="form-check-input me-2" type="checkbox" id={`ff-${f.key}`} checked={!!current}
                    onChange={(e)=>saveOne(f.key, e.target.checked)} disabled={saving} />
                  <label className="form-check-label" htmlFor={`ff-${f.key}`}>{f.label}</label>
                  {f.hint && <div className="text-muted small">{f.hint}</div>}
                </div>
                <span className="text-muted small">{String(!!current)}</span>
              </div>
            );
          }
          if (f.type === 'number') {
            const val = typeof current === 'number' ? current : f.defaultValue;
            return (
              <div key={f.key}>
                <label className="form-label small d-flex justify-content-between">
                  <span>{f.label}{f.unit?` (${f.unit})`:''}</span>
                  <span className="text-muted">{val}</span>
                </label>
                <input type="range" className="form-range" min={f.min} max={f.max} step={f.step||1} value={val}
                  onChange={(e)=>saveOne(f.key, Number(e.target.value))} disabled={saving} />
                {f.hint && <div className="text-muted small">{f.hint}</div>}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

