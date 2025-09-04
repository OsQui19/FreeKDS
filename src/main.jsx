import './utils/api.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/base.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AccessProvider } from './contexts/AccessContext.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';

function ensureRoot() {
  let el = document.getElementById('root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'root';
    document.body.appendChild(el);
  }
  return el;
}

const rootEl = ensureRoot();
try {
  console.log('[FreeKDS] Bootstrapping app…');
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AccessProvider>
          <App />
        </AccessProvider>
      </AppErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  console.error('[FreeKDS] Bootstrap failed', err);
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bootstrap error', stack: err?.stack || String(err) }),
    });
  } catch {}
  try {
    rootEl.innerHTML = '<pre style="padding:1rem">Bootstrap error. See console/server logs.</pre>';
  } catch {}
}
