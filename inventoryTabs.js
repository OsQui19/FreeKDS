document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("#inventoryTabs .nav-link");
  const panes = document.querySelectorAll(".inventory-pane");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const target = tab.dataset.pane;
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      panes.forEach((p) => p.classList.toggle("active", p.id === target));
    });
  });
});
