import React, { useEffect, useState } from 'react';
import MenuEditor from '@/features/AdminMenu/MenuEditor.jsx';

export default function MenuRoute() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin');
        if (!res.ok) throw new Error('Failed to load admin data');
        const json = await res.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e.message || 'Error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  const ingredients = data?.ingredients || [];
  const units = data?.units || [];
  const modifiers = data?.modifiers || [];
  return (
    <div className="admin-section">
      <h3 className="mb-3">Menu</h3>
      <MenuEditor ingredients={ingredients} units={units} modifiers={modifiers} />
    </div>
  );
}
