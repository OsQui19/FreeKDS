// Handle switching between inventory panes
function initInventoryTabs() {
  const links = document.querySelectorAll("#inventoryTabs .nav-link");
  const panes = document.querySelectorAll(".inventory-pane");
  const STORAGE_KEY = "activeInventoryPane";

  function activate(id) {
    links.forEach((l) => {
      l.classList.toggle("active", l.dataset.pane === id);
    });
    panes.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
    if (id) localStorage.setItem(STORAGE_KEY, id);
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activate(link.dataset.pane);
    });
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && document.getElementById(saved)) {
    activate(saved);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInventoryTabs);
} else {
  initInventoryTabs();
}
