// Handle switching between inventory panes
function initInventoryTabs() {
  const links = document.querySelectorAll("#inventoryTabs .nav-link");
  const panes = document.querySelectorAll(".inventory-pane");
  const STORAGE_KEY = "activeInventoryPane";

  function activate(id) {
    links.forEach((l) => {
      const active = l.dataset.pane === id;
      l.classList.toggle("active", active);
      l.setAttribute("aria-selected", active ? "true" : "false");
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
