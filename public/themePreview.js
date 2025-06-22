document.addEventListener('DOMContentLoaded', () => {
  const frame = document.getElementById('menuPreview');
  const form = document.querySelector('#themeForm form');
  if (!frame || !form) return;

  const update = () => {
    if (!frame.contentWindow || !frame.contentWindow.document) return;
    const doc = frame.contentWindow.document;
    const root = doc.documentElement.style;
    if (form.theme_primary_color) root.setProperty('--primary-color', form.theme_primary_color.value);
    if (form.theme_bg_color) root.setProperty('--bg-color', form.theme_bg_color.value);
    if (form.font_family) root.setProperty('--font-family', form.font_family.value);
    // custom css
    let styleEl = doc.getElementById('customCssPreview');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'customCssPreview';
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = form.custom_css ? form.custom_css.value : '';
  };

  form.addEventListener('input', update);
  frame.addEventListener('load', update);
});
