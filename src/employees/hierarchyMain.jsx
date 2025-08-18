import React from 'react';
import ReactDOM from 'react-dom/client';
import HierarchyApp from './HierarchyApp.jsx';
import './hierarchy.css';
import AdminLayout from '@/layouts/AdminLayout.jsx';

function mount() {
  const el = document.getElementById('hierarchyApp');
  if (!el) return;
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <AdminLayout>
        <HierarchyApp />
      </AdminLayout>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
