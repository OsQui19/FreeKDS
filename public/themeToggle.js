document.addEventListener('DOMContentLoaded', () => {
  const themeForm = document.getElementById('themeForm');
  const themeToggle = document.querySelector('button[data-bs-target="#themeForm"]');
  if (themeForm && themeToggle) {
    const storageKey = 'themeFormExpanded';
    if (localStorage.getItem(storageKey) === 'true') {
      themeForm.classList.add('show');
    }
    const updateText = () => {
      const expanded = themeForm.classList.contains('show');
      themeToggle.textContent = expanded ? 'Hide Settings' : 'Show Settings';
      localStorage.setItem(storageKey, expanded ? 'true' : 'false');
    };
    updateText();
    themeForm.addEventListener('shown.bs.collapse', updateText);
    themeForm.addEventListener('hidden.bs.collapse', updateText);
  }
});
