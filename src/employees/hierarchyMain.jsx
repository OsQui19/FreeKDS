import React from 'react';
import ReactDOM from 'react-dom/client';
import HierarchyApp from './HierarchyApp.jsx';

function mount() {
  const el = document.getElementById('hierarchyApp');
  if (!el) return;
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <HierarchyApp />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
