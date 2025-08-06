/* global tinycolor */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('theme-primary-color');
  const container = document.getElementById('color-suggestions');
  if (!input || !container || typeof tinycolor === 'undefined') return;

  const render = () => {
    container.innerHTML = '';
    const base = tinycolor(input.value);
    const complement = base.complement().toHexString();
    const analogous = base.analogous(3).slice(1, 3).map(c => c.toHexString());
    const colors = [complement, ...analogous];
    colors.forEach((c) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'color-swatch btn p-2 border';
      sw.style.backgroundColor = c;
      sw.dataset.color = c;
      sw.dataset.target = 'theme-bg-color';
      sw.title = c;
      container.appendChild(sw);
    });
  };

  input.addEventListener('input', render);
  render();
});
