document.addEventListener('DOMContentLoaded', () => {
  const themeForm = document.getElementById('themeForm');
  const themeToggle = document.querySelector('button[data-bs-target="#themeForm"]');
  if (themeForm && themeToggle) {
    const updateText = () => {
      themeToggle.textContent = themeForm.classList.contains('show') ? 'Hide Settings' : 'Show Settings';
    };
    updateText();
    themeForm.addEventListener('shown.bs.collapse', updateText);
    themeForm.addEventListener('hidden.bs.collapse', updateText);
  }
});
