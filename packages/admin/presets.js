import presets from '../../config/kitchen-presets.js';
import { emit } from '../../src/plugins/lifecycle.js';
import { clearTokenCache } from '../../src/utils/tokens.js';

export { presets };

export async function applyKitchenPreset(name) {
  const preset = presets[name];
  if (!preset) throw new Error('Unknown preset');

  try {
    if (preset.tokens) {
      const resp = await fetch(`/${preset.tokens}`);
      const data = await resp.json();
      await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      clearTokenCache();
    }
  } catch {
    /* ignore */
  }

  try {
    if (preset.layout) {
      const res = await fetch(
        `/api/layout?name=${encodeURIComponent(preset.layout)}`
      );
      if (res.ok) {
        const { layout } = await res.json();
        await fetch('/api/layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layout, name: 'default' }),
        });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    if (preset.routes) {
      await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: preset.routes }),
      });
    }
  } catch {
    /* ignore */
  }

  emit('config-updated', { preset: name });
}
