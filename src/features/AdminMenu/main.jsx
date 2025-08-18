import ReactDOM from 'react-dom/client';
import AdminLayout from '@/layouts/AdminLayout.jsx';
import AdminPanels from './AdminPanels.jsx';
import { PluginProvider } from '@/plugins/PluginManager.jsx';

function mount() {
  const rootEl = document.getElementById('adminMenuApp');
  if (!rootEl) return;

  let ingredients = [];
  let units = [];
  const script = document.currentScript || document.querySelector('script[data-ingredients]');
  if (script) {
    try {
      ingredients = JSON.parse(script.dataset.ingredients || '[]');
      units = JSON.parse(script.dataset.units || '[]');
    } catch (e) {
      console.warn('Failed to parse menu data', e);
    }
  }

  window.__ADMIN_MENU_DATA__ = { ingredients, units };

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
