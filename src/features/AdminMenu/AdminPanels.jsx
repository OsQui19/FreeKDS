import React, { useMemo, useState, useRef } from 'react';
import { usePlugins } from '@/plugins/PluginManager.jsx';

export default function AdminPanels() {
  const { plugins } = usePlugins();
  const panels = useMemo(() => {
    const list = [];
    plugins.forEach(({ meta }) => {
      const contrib = meta?.contributes?.adminPanels || [];
      contrib.forEach((p) => list.push(p));
    });
    return list;
  }, [plugins]);

  const [active, setActive] = useState(panels[0]?.id);
  const tabRefs = useRef({});

  const onKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const newIndex = (idx + dir + panels.length) % panels.length;
      const newId = panels[newIndex].id;
      tabRefs.current[newId]?.focus();
      setActive(newId);
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Admin Panels">
        {panels.map((p, idx) => (
          <button
            key={p.id}
            ref={(el) => (tabRefs.current[p.id] = el)}
            role="tab"
            className="admin-panel-tab btn btn-outline-primary me-2"
            aria-selected={active === p.id}
            tabIndex={active === p.id ? 0 : -1}
            onClick={() => setActive(p.id)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div
        id="admin-panel-content"
        role="tabpanel"
        tabIndex={0}
        aria-live="polite"
      >
        {panels.map((p) => {
          if (active !== p.id) return null;
          const props =
            typeof p.getProps === 'function' ? p.getProps() : p.props || {};
          const Panel = p.Component;
          return <Panel key={p.id} {...props} />;
        })}
      </div>
    </div>
  );
}
