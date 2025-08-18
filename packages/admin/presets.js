export const presetNames = [
  'fast-casual',
  'full-service',
  'barista',
  'qsr',
];

import { emit } from '../../src/plugins/lifecycle.js';
import { clearTokenCache } from '../../src/utils/tokens.js';

export async function applyKitchenPreset(name) {
  const path = `tokens/presets/${name}.json`;
  let preset;
  try {
    const resp = await fetch(`/${path}`);
    preset = await resp.json();
  } catch {
    throw new Error('Unknown preset');
  }

  try {
    if (preset.tokens) {
      await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset.tokens),
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
    if (Array.isArray(preset.routes)) {
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
