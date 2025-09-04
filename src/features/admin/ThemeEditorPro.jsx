import React, { useEffect, useState } from 'react';
import { clearTokenCache, resolveTokens } from '@/utils/tokens.js';

function ColorInput({ label, value, onChange }) {
  return (
    <div className="col-md-3">
      <label className="form-label small d-block">{label}</label>
      <input type="color" className="form-control form-control-color" value={value} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}

export default function ThemeEditorPro() {
  const [tokens, setTokens] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState('global'); // global | station | screen
  const [scopeId, setScopeId] = useState('');
  const PETITE = {
    color: {
      surface: { $value: '#fbfbfc' },
      text: { $value: '#1f2937' },
      accent: { $value: '#5b8def' },
      background: { $value: '#ffffff' },
    },
    radius: {
      card: { $value: '0.75rem' },
      button: { $value: '0.5rem' },
      field: { $value: '0.5rem' },
    },
    shadow: {
      sm: { $value: '0 1px 1.5px rgba(0,0,0,0.05)' },
      md: { $value: '0 6px 10px rgba(0,0,0,0.08)' },
    },
    space: {
      xs: { $value: '.375rem' },
      sm: { $value: '.75rem' },
      md: { $value: '1.25rem' },
      lg: { $value: '2.5rem' },
    },
    font: { size: { sm: { $value: '.9rem' }, md: { $value: '1rem' }, lg: { $value: '1.2rem' } } },
  };

  useEffect(() => {
    (async () => {
      try {
        const t = await resolveTokens();
        setTokens(t);
      } catch (e) {
        setError('Failed to load tokens');
      }
    })();
  }, []);

  if (!tokens) return <div>Loading…</div>;

  const get = (p, def='') => p.split('.').reduce((o,k)=>o?.[k], tokens)?.$value ?? def;
  const set = (p, v) => {
    const parts = p.split('.');
    setTokens((t) => {
      const next = { ...t };
      let cur = next;
      for (let i=0;i<parts.length;i++) {
        const k = parts[i];
        if (i === parts.length - 1) {
          cur[k] = { ...(cur[k]||{}), $value: v };
        } else {
          cur[k] = { ...(cur[k]||{}) };
          cur = cur[k];
        }
      }
      return next;
    });
  };

  const save = async () => {
    setSaveMsg(null); setError(null);
    try {
      const body = JSON.stringify({ color: tokens.color, font: tokens.font, space: tokens.space, radius: tokens.radius });
      const qs = new URLSearchParams();
      if (scope === 'station' && scopeId) qs.append('stationId', scopeId);
      if (scope === 'screen' && scopeId) qs.append('screenId', scopeId);
      const res = await fetch(`/api/tokens${qs.toString() ? `?${qs}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) throw new Error('Save failed');
      clearTokenCache();
      setSaveMsg('Saved');
    } catch (e) {
      setError('Save failed');
    }
  };

  return (
    <div>
      <h3 className="mb-3">Theme</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {saveMsg && <div className="alert alert-success">{saveMsg}</div>}
      <div className="admin-section mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label small">Scope</label>
            <select className="form-select" value={scope} onChange={(e)=>setScope(e.target.value)}>
              <option value="global">Global</option>
              <option value="station">Station</option>
              <option value="screen">Screen</option>
            </select>
          </div>
          {(scope === 'station' || scope === 'screen') && (
            <div className="col-md-3">
              <label className="form-label small">{scope === 'station' ? 'Station ID' : 'Screen ID'}</label>
              <input className="form-control" value={scopeId} onChange={(e)=>setScopeId(e.target.value)} placeholder="e.g. 1" />
            </div>
          )}
          <div className="col-md-3 ms-auto text-end">
            <label className="form-label small d-block">Presets</label>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setTokens((t)=>({ ...t, ...PETITE }))}>Apply “Petite”</button>
          </div>
        </div>
      </div>
      <div className="admin-section">
        <div className="row g-3">
          <ColorInput label="Surface" value={get('color.surface','#f8f9fa')} onChange={(v)=>set('color.surface',v)} />
          <ColorInput label="Text" value={get('color.text','#212529')} onChange={(v)=>set('color.text',v)} />
          <ColorInput label="Accent" value={get('color.accent','#0d6efd')} onChange={(v)=>set('color.accent',v)} />
          <ColorInput label="Background" value={get('color.background','#ffffff')} onChange={(v)=>set('color.background',v)} />
        </div>
        <button className="btn btn-primary mt-3" onClick={save}>Save Theme</button>
      </div>
      <div className="admin-section mt-3">
        <h5>Typography & Spacing</h5>
        <div className="row g-3">
          {['sm','md','lg','xl'].map(k => (
            <div key={k} className="col-md-3">
              <label className="form-label small">Font {k.toUpperCase()}</label>
              <input className="form-control" value={get(`font.size.${k}`,'')} onChange={(e)=>set(`font.size.${k}`, e.target.value)} placeholder="e.g. 1rem" />
            </div>
          ))}
          {['xs','sm','md','lg','xl'].map(k => (
            <div key={k} className="col-md-3">
              <label className="form-label small">Space {k.toUpperCase()}</label>
              <input className="form-control" value={get(`space.${k}`,'')} onChange={(e)=>set(`space.${k}`, e.target.value)} placeholder="e.g. 0.5rem" />
            </div>
          ))}
          {['card','button','field'].map(k => (
            <div key={k} className="col-md-3">
              <label className="form-label small">Radius {k}</label>
              <input className="form-control" value={get(`radius.${k}`,'')} onChange={(e)=>set(`radius.${k}`, e.target.value)} placeholder="e.g. 0.5rem" />
            </div>
          ))}
        </div>
        <button className="btn btn-primary mt-3" onClick={save}>Save Theme</button>
      </div>
      <div className="text-muted small mt-2">Advanced editing is available in the legacy JSON editor.</div>
    </div>
  );
}
