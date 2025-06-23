// Handle switching between inventory panes
function initInventoryTabs() {
  const links = document.querySelectorAll("#inventoryTabs .nav-link");
  const panes = document.querySelectorAll(".inventory-pane");

  function activate(id) {
    links.forEach((l) => {
      l.classList.toggle("active", l.dataset.pane === id);
    });
    panes.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activate(link.dataset.pane);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInventoryTabs);
} else {
  initInventoryTabs();
}
