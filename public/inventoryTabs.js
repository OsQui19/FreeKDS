// Handle switching between inventory panes
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('#inventoryTabs .nav-link');
  const panes = document.querySelectorAll('.inventory-pane');

  function activate(id) {
    links.forEach(l => {
      l.classList.toggle('active', l.dataset.pane === id);
    });
    panes.forEach(p => {
      p.classList.toggle('active', p.id === id);
    });
  }

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      activate(link.dataset.pane);
    });
  });
});
