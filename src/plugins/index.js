async function loadFromServer() {
  const res = await fetch('/api/plugins');
  if (!res.ok) throw new Error('Failed to load plugin registry');
  const json = await res.json();
  const list = Array.isArray(json.plugins) ? json.plugins : [];
  const plugins = await Promise.all(list.map(async (m) => {
    try {
      const mod = await import(/* @vite-ignore */ `./${m.dir}/${m.main}`);
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
  const manifests = import.meta.glob('./*/plugin.json', { eager: true, import: 'default' });
  const plugins = await Promise.all(
    Object.entries(manifests).map(async ([path, manifest]) => {
      const base = path.replace(/plugin\.json$/, '');
      try {
        const mod = await import(/* @vite-ignore */ `${base}${manifest.main}`);
        if (typeof mod.default !== 'function') return null;
        const contributes = { actions: [], routes: [], transforms: [], shortcuts: [], adminPanels: [], ...(manifest.contributes || {}) };
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
  try {
    return await loadFromServer();
  } catch {
    // Fallback for dev/SSR or if registry missing
    return await loadFromFilesystem();
  }
}
