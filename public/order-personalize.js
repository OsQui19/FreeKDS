// order-personalize.js
(function() {
  const panel = document.getElementById('personalizePanel');
  if (!panel) return; // not an admin / not in personalize mode

  const $ = (sel, root = panel) => root.querySelector(sel);
  const toggleBtn = document.getElementById('personalizeToggle');

  const inputs = {
    layout: $('#ui-menu-layout'),
    primary: $('#ui-primary'),
    text: $('#ui-text'),
    bg: $('#ui-bg'),
    font: $('#ui-font'),
    radius: $('#ui-radius'),
    shadow: $('#ui-shadow')
  };

  const applyVars = () => {
    const root = document.documentElement;
    // Set CSS custom properties (used by your CSS & Bootstrap mapping)
    root.style.setProperty('--primary-color', inputs.primary.value || '#3366cc');
    root.style.setProperty('--text-color', inputs.text.value || '#000000');
    root.style.setProperty('--bg-color', inputs.bg.value || '#f8f8f8');
    if (inputs.font.value) root.style.setProperty('--font-family', inputs.font.value);
    root.style.setProperty('--button-radius', (inputs.radius.value || 6) + 'px');
    root.style.setProperty('--card-shadow', inputs.shadow.value || '0 2px 6px rgba(0,0,0,0.08)');

    // Switch menu layout class on <body>
    const b = document.body;
    b.classList.remove('menu-layout-grid', 'menu-layout-list');
    b.classList.add(inputs.layout.value === 'list' ? 'menu-layout-list' : 'menu-layout-grid');
  };

  // Save to server (if endpoint exists) else localStorage
  async function saveConfig() {
    const payload = {
      menu_layout: inputs.layout.value,
      theme_primary_color: inputs.primary.value,
      text_color: inputs.text.value,
      theme_bg_color: inputs.bg.value,
      font_family: inputs.font.value,
      button_radius: Number(inputs.radius.value || 6),
      card_shadow: inputs.shadow.value
    };

    try {
      const res = await fetch('/admin/settings/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'order_ui', value: payload })
      });
      if (!res.ok) throw new Error('Server refused config save');
      return true;
    } catch (e) {
      // Fallback
      localStorage.setItem('order_ui', JSON.stringify(payload));
      return false;
    }
  }

  function loadConfig() {
    // First, try server-provided defaults embedded in dataset (if you add them).
    // Then try localStorage for user preview continuity.
    try {
      const raw = localStorage.getItem('order_ui');
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.menu_layout) inputs.layout.value = cfg.menu_layout;
        if (cfg.theme_primary_color) inputs.primary.value = cfg.theme_primary_color;
        if (cfg.text_color) inputs.text.value = cfg.text_color;
        if (cfg.theme_bg_color) inputs.bg.value = cfg.theme_bg_color;
        if (cfg.font_family) inputs.font.value = cfg.font_family;
        if (typeof cfg.button_radius !== 'undefined') inputs.radius.value = cfg.button_radius;
        if (cfg.card_shadow) inputs.shadow.value = cfg.card_shadow;
      }
    } catch (_) {}
  }

  // Wire up
  Object.values(inputs).forEach(el => {
    el.addEventListener('input', applyVars);
    el.addEventListener('change', applyVars);
  });

  $('#ui-save').addEventListener('click', async () => {
    const ok = await saveConfig();
    // Tiny toast feedback
    const btn = $('#ui-save');
    const old = btn.textContent;
    btn.textContent = ok ? 'Saved' : 'Saved (local)';
    setTimeout(() => (btn.textContent = old), 1200);
  });

  $('#ui-close').addEventListener('click', () => {
    panel.classList.remove('open');
    toggleBtn?.focus();
  });
  toggleBtn?.addEventListener('click', () => panel.classList.toggle('open'));

  // Initial
  loadConfig();
  applyVars();
})();

