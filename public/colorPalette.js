
// public/colorPalette.js
(function() {
  const wrap = document.getElementById('color-suggestions');
  const input = document.getElementById('theme-primary-color');
  if (!wrap || !input || typeof tinycolor === 'undefined') return;
  const render = () => {
    const rootStyles = getComputedStyle(document.documentElement);
    const baseColor = input.value || rootStyles.getPropertyValue('--color-primary').trim();
    const base = tinycolor(baseColor);
    const palette = [
      base.clone().lighten(10),
      base.clone().lighten(20),
      base.clone().darken(10),
      base.clone().saturate(10),
      base.clone().desaturate(10)
    ];
    wrap.innerHTML = '';
    palette.forEach(tc => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm border';
      btn.style.background = tc.toHexString();
      btn.style.minWidth = '2rem';
      btn.style.height = '2rem';
      btn.title = tc.toHexString();
      btn.addEventListener('click', () => {
        input.value = tc.toHexString();
        input.dispatchEvent(new Event('input'));
      });
      wrap.appendChild(btn);
    });
  };
  input.addEventListener('input', render);
  render();
})();
