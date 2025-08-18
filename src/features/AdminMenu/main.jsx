import ReactDOM from 'react-dom/client';
import MenuEditor from './MenuEditor.jsx';
import AdminLayout from '@/layouts/AdminLayout.jsx';

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

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AdminLayout>
        <MenuEditor ingredients={ingredients} units={units} />
      </AdminLayout>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
