import React from 'react';

function categorize(name = '') {
  const s = String(name).toLowerCase();
  if (/soup|bisque|broth/.test(s)) return 'Soups';
  if (/salad/.test(s)) return 'Salads';
  if (/salmon|sea\s?bass|calamari|shrimp|fish|tuna|seafood/.test(s)) return 'Seafoods';
  return 'Other';
}

export default function KdsSidebar({ orders = [] }) {
  const counts = React.useMemo(() => {
    const byCategory = new Map();
    for (const o of orders) {
      for (const it of o.items || []) {
        const cat = categorize(it.name);
        if (!byCategory.has(cat)) byCategory.set(cat, new Map());
        const m = byCategory.get(cat);
        m.set(it.name, (m.get(it.name) || 0) + (it.quantity || 0));
      }
    }
    return byCategory;
  }, [orders]);

  const totalByItem = React.useMemo(() => {
    let sum = 0; counts.forEach((m)=> m.forEach((qty)=> { sum += qty; }));
    return sum;
  }, [counts]);

  return (
    <aside className="kds-sidebar">
      <div className="kds-sidebar-header">
        <div>Product</div>
        <div className="text-end">Qty</div>
      </div>
      {[...counts.entries()].map(([cat, items]) => (
        <div key={cat} className="kds-sidebar-section">
          <div className="kds-sidebar-title">{cat}</div>
          <ul className="kds-sidebar-list">
            {[...items.entries()].sort((a,b)=> b[1]-a[1]).map(([name, qty]) => (
              <li key={name}>
                <span className="name" title={name}>{name}</span>
                <span className="qty">{qty}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!counts.size && (
        <div className="text-muted small p-2">No active items</div>
      )}
    </aside>
  );
}

