
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
    const rootStyles = getComputedStyle(document.documentElement);
    return {
      '--color-primary': get('theme-primary-color')?.value || rootStyles.getPropertyValue('--color-primary').trim(),
      '--color-bg': get('theme-bg-color')?.value || rootStyles.getPropertyValue('--color-bg').trim(),
      '--color-text': get('text-color')?.value || rootStyles.getPropertyValue('--color-text').trim(),
      '--font-family': get('font-family')?.value || rootStyles.getPropertyValue('--font-family').trim(),
      '--button-radius': (get('button-radius')?.value || rootStyles.getPropertyValue('--button-radius').trim() || '6px'),
      '--card-shadow': get('card-shadow')?.value || rootStyles.getPropertyValue('--card-shadow').trim() || '0 2px 6px rgba(0,0,0,0.08)'
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
