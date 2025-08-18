import React from 'react';
import ReactDOM from 'react-dom/client';
import OnboardingApp from './OnboardingApp.jsx';
import AdminLayout from '@/layouts/AdminLayout.jsx';

function mount() {
  const el = document.getElementById('onboardingApp');
  if (!el) return;
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <AdminLayout>
        <OnboardingApp />
      </AdminLayout>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
