import React, { useEffect, useMemo, useState } from 'react';

export default function InventoryPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin');
        if (!res.ok) throw new Error('Failed to load inventory');
        const json = await res.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e.message || 'Error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Ingredients', value: data.ingredients?.length || 0 },
      { label: 'Suppliers', value: data.suppliers?.length || 0 },
      { label: 'Purchase Orders', value: data.orders?.length || 0 },
      { label: 'Locations', value: data.locations?.length || 0 },
      { label: 'Units', value: data.units?.length || 0 },
      { label: 'Tags', value: data.tags?.length || 0 },
    ];
  }, [data]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="admin-header">
        <h3 className="m-0">Inventory</h3>
      </div>
      <div className="admin-grid">
        {summary.map((s) => (
          <div key={s.label} className="card-surface p-3">
            <div className="text-muted small">{s.label}</div>
            <div className="fs-3 fw-bold">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="admin-section mt-3">
        <h5 className="mb-3">Ingredients</h5>
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>SKU</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {(data.ingredients || []).slice(0, 50).map((ing) => (
                <tr key={ing.id}>
                  <td>{ing.name}</td>
                  <td>{ing.quantity}</td>
                  <td>{ing.unit}</td>
                  <td>{ing.sku || '-'}</td>
                  <td>{ing.cost ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.ingredients && data.ingredients.length > 50 && (
          <div className="text-muted small">Showing first 50…</div>
        )}
      </div>
    </div>
  );
}

InventoryPanel.meta = {
  id: 'inventory',
  title: 'Inventory',
  dataDomain: 'inventory',
  scopes: ['inventory:read', 'inventory:write'],
  latencyClass: 'interactive',
};

