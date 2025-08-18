export default async function loadPlugins() {
  const manifests = import.meta.glob("./*/plugin.json", {
    eager: true,
    import: "default",
  });

  const plugins = await Promise.all(
    Object.entries(manifests).map(async ([path, manifest]) => {
      const base = path.replace(/plugin\.json$/, "");
      try {
        const mod = await import(/* @vite-ignore */ `${base}${manifest.main}`);
        const contributes = {
          actions: [],
          routes: [],
          transforms: [],
          shortcuts: [],
          adminPanels: [],
          ...(manifest.contributes || {}),
        };
        return {
          Component: mod.default,
          meta: { ...manifest, ...(mod.meta || {}), contributes },
        };
      } catch (err) {
        console.error(`Failed to load plugin: ${manifest.id || path}`, err);
        return null;
      }
    })
  );

  return plugins.filter(Boolean);
}

