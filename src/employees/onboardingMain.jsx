import React from 'react';
import ReactDOM from 'react-dom/client';
import OnboardingApp from './OnboardingApp.jsx';

function mount() {
  const el = document.getElementById('onboardingApp');
  if (!el) return;
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <OnboardingApp />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
