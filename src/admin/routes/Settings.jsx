import React, { useEffect, useState } from 'react';

export default function SettingsRoute() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      setSettings(json.settings || {});
    } catch (e) {
      setErr('Failed to load settings');
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setMsg(null); setErr(null);
    try {
      const body = {
        kds_warn_minutes: String(e.target.kds_warn_minutes.value || settings.kds_warn_minutes || 7),
        kds_critical_minutes: String(e.target.kds_critical_minutes.value || settings.kds_critical_minutes || 12),
        kds_sound_new: e.target.kds_sound_new.value || settings.kds_sound_new || 'beep',
        kds_sound_urgent: e.target.kds_sound_urgent.value || settings.kds_sound_urgent || 'beep2',
        webhook_url: e.target.webhook_url.value || settings.webhook_url || '',
        webhook_secret: e.target.webhook_secret.value || settings.webhook_secret || ''
      };
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      setMsg('Saved');
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to save');
    }
  };

  return (
    <div className="admin-section">
      <h3 className="mb-3">Settings</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}
      <form className="row g-3" onSubmit={save}>
        <div className="col-md-3">
          <label className="form-label small">KDS Warn (minutes)</label>
          <input name="kds_warn_minutes" type="number" className="form-control" defaultValue={settings.kds_warn_minutes || 7} />
        </div>
        <div className="col-md-3">
          <label className="form-label small">KDS Critical (minutes)</label>
          <input name="kds_critical_minutes" type="number" className="form-control" defaultValue={settings.kds_critical_minutes || 12} />
        </div>
        <div className="col-md-3">
          <label className="form-label small">New Order Sound</label>
          <input name="kds_sound_new" className="form-control" defaultValue={settings.kds_sound_new || 'beep'} />
        </div>
        <div className="col-md-3">
          <label className="form-label small">Urgent Sound</label>
          <input name="kds_sound_urgent" className="form-control" defaultValue={settings.kds_sound_urgent || 'beep2'} />
        </div>
        <div className="col-12 mt-3">
          <h5>Webhooks</h5>
        </div>
        <div className="col-md-6">
          <label className="form-label small">Webhook URL</label>
          <input name="webhook_url" className="form-control" defaultValue={settings.webhook_url || ''} placeholder="https://example.com/webhook-endpoint" />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Webhook Secret</label>
          <input name="webhook_secret" className="form-control" defaultValue={settings.webhook_secret || ''} />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button className="btn btn-outline-secondary" type="button" onClick={async ()=>{ try { await fetch('/api/webhooks/test', { method: 'POST' }); setMsg('Test sent'); } catch { setErr('Test failed'); } }}>Send Test</button>
        </div>
        <div className="col-12 text-end">
          <button className="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
