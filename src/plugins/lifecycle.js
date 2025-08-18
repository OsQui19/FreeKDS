const registry = new Map();
const bus = new EventTarget();

export function install(plugin) {
  registry.set(plugin.meta?.id, { plugin, enabled: false, active: false });
}

export function enable(plugin) {
  const entry = registry.get(plugin.meta?.id);
  if (entry) entry.enabled = true;
}

export function activate(plugin) {
  const entry = registry.get(plugin.meta?.id);
  if (entry && entry.enabled && !entry.active) {
    entry.active = true;
    if (typeof plugin.activate === 'function') {
      entry.dispose = plugin.activate();
    }
  }
}

export function deactivate(plugin) {
  const entry = registry.get(plugin.meta?.id);
  if (entry && entry.active) {
    if (typeof entry.dispose === 'function') entry.dispose();
    if (typeof plugin.deactivate === 'function') plugin.deactivate();
    entry.active = false;
  }
}

export function on(event, handler) {
  bus.addEventListener(event, handler);
  return () => bus.removeEventListener(event, handler);
}

export function emit(event, detail) {
  bus.dispatchEvent(new CustomEvent(event, { detail }));
}
