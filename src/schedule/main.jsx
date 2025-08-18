import React from 'react';
import ReactDOM from 'react-dom/client';
import ScheduleApp from './ScheduleApp.jsx';
import DashboardLayout from '@/layouts/DashboardLayout.jsx';

function mountApp() {
  const rootEl = document.getElementById('scheduleApp');
  if (!rootEl) {
    console.error('scheduleApp element not found');
    return;
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <DashboardLayout>
        <ScheduleApp />
      </DashboardLayout>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
