import ReactDOM from 'react-dom/client';
import AdminLayout from '@/layouts/AdminLayout.jsx';
import AdminPanels from './AdminPanels.jsx';
import { PluginProvider } from '@/plugins/PluginManager.jsx';

function mount() {
  const rootEl = document.getElementById('adminApp');
  if (!rootEl) return;

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <PluginProvider>
        <AdminLayout>
          <AdminPanels />
        </AdminLayout>
      </PluginProvider>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
