document.addEventListener('DOMContentLoaded', () => {
  const sideNav = document.getElementById('sideNav');
  const toggleBtn = document.getElementById('menuToggle');
  if (!sideNav || !toggleBtn) return;
  toggleBtn.addEventListener('click', () => {
    sideNav.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (
      sideNav.classList.contains('open') &&
      !sideNav.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      sideNav.classList.remove('open');
    }
  });
});

