import React, { useEffect, useState } from 'react';

export default function ThemeEditor() {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tokens');
        const json = await res.json();
        setValue(JSON.stringify(json, null, 2));
      } catch (e) {
        setError('Failed to load tokens');
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const body = JSON.parse(value);
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('save');
      setOk(true);
    } catch (e) {
      setError('Invalid JSON or save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3>Theme Tokens</h3>
      <p className="text-muted">Edit design tokens as JSON and save.</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">Saved</div>}
      <textarea
        className="form-control"
        rows={20}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="btn btn-primary mt-3" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

ThemeEditor.meta = {
  id: 'theme-editor',
  title: 'Theme Editor',
  dataDomain: 'tokens',
  scopes: ['tokens:write'],
  latencyClass: 'interactive',
};

