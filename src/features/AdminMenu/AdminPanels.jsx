import React, { useState, useRef, useEffect } from 'react';
import { usePlugins } from '@/plugins/PluginManager.jsx';
import { discoverPanels } from '../../../packages/admin/index.js';
import { on } from '@/plugins/lifecycle.js';
export default function AdminPanels() {
  const { plugins } = usePlugins();
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState({});

  useEffect(() => {
    async function load() {
      const g = await discoverPanels(plugins);
      setGroups(g);
      setActive((prev) => {
        const next = { ...prev };
        g.forEach((group) => {
          if (!next[group.category] && group.panels.length) {
            next[group.category] = group.panels[0].id;
          }
        });
        return next;
      });
    }
    load();
    const off = on('config-updated', load);
    return off;
  }, [plugins]);

  const tabRefs = useRef({});

  const onKeyDown = (e, group, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const panels = group.panels;
      const newIndex = (idx + dir + panels.length) % panels.length;
      const newId = panels[newIndex].id;
      tabRefs.current[newId]?.focus();
      setActive((prev) => ({ ...prev, [group.category]: newId }));
    }
  };

  return (
    <div>
      {groups.map((group) => (
        <div key={group.category}>
          <h3 className="mt-3 text-capitalize">{group.category}</h3>
          <div role="tablist" aria-label={`${group.category} panels`}>
            {group.panels.map((p, idx) => (
              <button
                key={p.id}
                ref={(el) => (tabRefs.current[p.id] = el)}
                role="tab"
                className="admin-panel-tab btn btn-outline-primary me-2"
                aria-selected={active[group.category] === p.id}
                tabIndex={active[group.category] === p.id ? 0 : -1}
                onClick={() =>
                  setActive((prev) => ({ ...prev, [group.category]: p.id }))
                }
                onKeyDown={(e) => onKeyDown(e, group, idx)}
              >
                {p.title}
              </button>
            ))}
          </div>
          <div role="tabpanel" tabIndex={0} aria-live="polite">
            {group.panels.map((p) => {
              if (active[group.category] !== p.id) return null;
              const props =
                typeof p.getProps === 'function' ? p.getProps() : p.props || {};
              const Panel = p.Component;
              return <Panel key={p.id} {...props} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
