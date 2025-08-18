import MenuPanel from './MenuPanel.jsx';
import StationsPanel from './StationsPanel.jsx';

export const corePanels = {
  menu: MenuPanel,
  stations: StationsPanel,
};

export default corePanels;

export async function discoverPanels(plugins = []) {
  let data = {};
  try {
    const res = await fetch('/api/modules');
    if (res.ok) data = await res.json();
  } catch {
    /* ignore */
  }
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const categories = groups.map((g) => ({ category: g.category, panels: [] }));
  const catMap = new Map(categories.map((g) => [g.category, g]));

  groups.forEach((g) => {
    g.modules.forEach((m) => {
      const Component = corePanels[m];
      const meta = Component?.meta;
      if (
        meta &&
        Array.isArray(meta.dataDomains) &&
        Array.isArray(meta.scopes) &&
        meta.latency
      ) {
        catMap.get(g.category).panels.push({
          id: meta.id || m,
          title: meta.title || m,
          Component,
        });
      }
    });
  });

  plugins.forEach(({ meta }) => {
    const contrib = meta?.contributes?.adminPanels || [];
    contrib.forEach((p) => {
      const Component = p.Component;
      const meta = Component?.meta;
      if (
        !meta ||
        !Array.isArray(meta.dataDomains) ||
        !Array.isArray(meta.scopes) ||
        !meta.latency
      )
        return;
      const cat = p.category || 'admin';
      let group = catMap.get(cat);
      if (!group) {
        group = { category: cat, panels: [] };
        catMap.set(cat, group);
        categories.push(group);
      }
      group.panels.push({
        id: p.id || meta.id,
        title: p.title || meta.title,
        Component,
        getProps: p.getProps,
        props: p.props,
      });
    });
  });

  return categories;
}
