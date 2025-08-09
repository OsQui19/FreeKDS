
// public/themePreview.js
(function() {
  const form = document.getElementById('themeFormEl');
  if (!form) return;
  const menuFrame = document.getElementById('menuPreview');
  const stationFrame = document.getElementById('stationPreview');
  const inputs = form.querySelectorAll('input, select, textarea');

  const applyVars = (doc, vars) => {
    if (!doc) return;
    const root = doc.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  };

  const computeVars = () => {
    const get = id => form.querySelector('#' + id);
    return {
      '--primary-color': get('theme-primary-color')?.value || '#3366cc',
      '--bg-color': get('theme-bg-color')?.value || '#222222',
      '--text-color': get('text-color')?.value || '#000000',
      '--font-family': get('font-family')?.value || '',
      '--button-radius': (get('button-radius')?.value || 6) + 'px',
      '--card-shadow': get('card-shadow')?.value || '0 2px 6px rgba(0,0,0,0.08)'
    };
  };

  const setMenuLayout = () => {
    const layout = form.querySelector('#menu-layout')?.value || 'grid';
    if (!menuFrame?.contentDocument) return;
    const b = menuFrame.contentDocument.body;
    b.classList.remove('menu-layout-grid', 'menu-layout-list');
    b.classList.add(layout === 'list' ? 'menu-layout-list' : 'menu-layout-grid');
  };

  const sync = () => {
    const vars = computeVars();
    if (menuFrame?.contentDocument) applyVars(menuFrame.contentDocument, vars);
    if (stationFrame?.contentDocument) applyVars(stationFrame.contentDocument, vars);
    setMenuLayout();
  };

  inputs.forEach(inp => inp.addEventListener('input', sync));
  inputs.forEach(inp => inp.addEventListener('change', sync));
  document.getElementById('togglePreview')?.addEventListener('click', () => {
    const preview = document.getElementById('previewTabContent');
    if (!preview) return;
    const hidden = preview.style.display === 'none';
    preview.style.display = hidden ? '' : 'none';
    document.getElementById('togglePreview').textContent = hidden ? 'Hide Preview' : 'Show Preview';
  });
  document.getElementById('resetPreview')?.addEventListener('click', () => {
    form.reset(); sync();
  });
  menuFrame?.addEventListener('load', sync);
  stationFrame?.addEventListener('load', sync);
  sync();
})();
