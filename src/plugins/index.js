async function loadFromServer() {
  const res = await fetch('/api/plugins');
  if (!res.ok) throw new Error('Failed to load plugin registry');
  const json = await res.json();
  const list = Array.isArray(json.plugins) ? json.plugins : [];
  const plugins = await Promise.all(list.map(async (m) => {
    try {
      const relDir = String(m.dir || '').replace(/^\//, '');
      const relMain = String(m.main || 'index.js').replace(/^\.\//, '');
      const mod = await import(/* @vite-ignore */ `./${relDir}/${relMain}`);
      if (typeof mod.default !== 'function') return null;
      const contributes = {
        actions: [], routes: [], transforms: [], shortcuts: [], adminPanels: [],
        ...(m.contributes || {}),
      };
      const meta = { ...m, ...(mod.meta || {}), contributes };
      return { Component: mod.default, meta };
    } catch (err) {
      console.error('Failed to import plugin', m.id || m.dir, err);
      return null;
    }
  }));
  return plugins.filter(Boolean);
}

async function loadFromFilesystem() {
  // Eagerly include all manifests at build time, and lazily import matching modules
  const manifests = import.meta.glob('./*/plugin.json', { eager: true, import: 'default' });
  const modules = import.meta.glob('./*/index.js');
  const plugins = await Promise.all(
    Object.entries(manifests).map(async ([path, manifest]) => {
      try {
        const base = path.replace(/plugin\.json$/, '');
        const moduleKey = `${base}${String(manifest.main || './index.js').replace(/^\.\//, '')}`;
        const loader = modules[moduleKey];
        if (!loader) {
          console.error('Plugin entry not bundled', manifest.id || moduleKey);
          return null;
        }
        const mod = await loader();
        if (typeof mod.default !== 'function') return null;
        const contributes = {
          actions: [], routes: [], transforms: [], shortcuts: [], adminPanels: [],
          ...(manifest.contributes || {}),
        };
        return { Component: mod.default, meta: { ...manifest, ...(mod.meta || {}), contributes } };
      } catch (err) {
        console.error('Failed to load plugin from FS', manifest.id || path, err);
        return null;
      }
    })
  );
  return plugins.filter(Boolean);
}

export default async function loadPlugins() {
  // Prefer bundler-discovered plugins to avoid runtime HTTP import issues
  try {
    const fsPlugins = await loadFromFilesystem();
    if (fsPlugins && fsPlugins.length) return fsPlugins;
  } catch {}
  try {
    return await loadFromServer();
  } catch {
    return [];
  }
}
