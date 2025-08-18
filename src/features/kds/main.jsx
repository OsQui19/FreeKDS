import React from 'react';
import ReactDOM from 'react-dom/client';
import KdsApp from './KdsApp.jsx';
import { featureFlagClient } from '@/featureFlags/index.js';

async function mount() {
  const rootEl = document.getElementById('kdsApp');
  if (!rootEl) return;
  const script =
    document.currentScript || document.querySelector('script[data-station-type]');
  const stationType = script ? script.dataset.stationType : undefined;
  const stationId = script ? Number(script.dataset.stationId) : undefined;
  const context = stationId ? { station: String(stationId) } : {};
  const transport = await featureFlagClient.getStringValue(
    'transport.type',
    script ? script.dataset.transport || 'ws' : 'ws',
    context
  );
  const fallback = await featureFlagClient.getStringValue(
    'transport.fallback',
    'sse',
    context
  );

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <KdsApp
        stationType={stationType}
        stationId={stationId}
        transport={transport}
        fallback={fallback}
      />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
