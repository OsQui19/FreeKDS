import React from 'react';
import ReactDOM from 'react-dom/client';
import KdsApp from './KdsApp.jsx';

function mount() {
  const rootEl = document.getElementById('kdsApp');
  if (!rootEl) return;
  const script =
    document.currentScript || document.querySelector('script[data-station-type]');
  const stationType = script ? script.dataset.stationType : undefined;
  const stationId = script ? Number(script.dataset.stationId) : undefined;
  const transport = script ? script.dataset.transport || 'ws' : 'ws';

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <KdsApp
        stationType={stationType}
        stationId={stationId}
        transport={transport}
      />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
