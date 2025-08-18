export const presets = {
  'fast-casual': {
    tokens: 'tokens/presets/fast-casual.json',
    layout: 'fast-casual',
    routes: ['/orders', '/kds'],
  },
  'full-service': {
    tokens: 'tokens/presets/full-service.json',
    layout: 'full-service',
    routes: ['/orders', '/stations', '/reports'],
  },
  barista: {
    tokens: 'tokens/presets/barista.json',
    layout: 'barista',
    routes: ['/orders'],
  },
  qsr: {
    tokens: 'tokens/presets/qsr.json',
    layout: 'qsr',
    routes: ['/orders', '/kds', '/stations'],
  },
};

import { emit } from '../../src/plugins/lifecycle.js';
import { clearTokenCache } from '../../src/utils/tokens.js';

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
