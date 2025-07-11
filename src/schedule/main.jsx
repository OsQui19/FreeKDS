import React from 'react';
import ReactDOM from 'react-dom/client';
import ScheduleApp from './ScheduleApp.jsx';

function init() {
  const rootEl = document.getElementById('scheduleApp');
  if (!rootEl) return;
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ScheduleApp />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
