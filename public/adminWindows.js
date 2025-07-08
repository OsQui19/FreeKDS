document.addEventListener("DOMContentLoaded", () => {
  const sideNav = document.getElementById("sideNav");
  const container = document.getElementById("windowsContainer");
  const allowed = Array.isArray(window.allowedModules) ? window.allowedModules : [];
  const templates = {};
  allowed.forEach((m) => {
    const el = document.getElementById(`tpl-${m}`);
    if (el) templates[m] = el.innerHTML;
  });
  function show(type) {
    sideNav.querySelectorAll(".nav-link").forEach((l) => {
      l.classList.toggle("active", l.dataset.type === type);
    });
    container.querySelectorAll(".admin-window").forEach((p) => {
      p.classList.toggle("active", p.dataset.type === type);
    });
  }

  allowed.forEach((type) => {
    const pane = document.createElement("section");
    pane.className = "admin-window";
    pane.dataset.type = type;
    pane.innerHTML = templates[type] || "";

    // append pane before executing embedded scripts so DOM elements exist
    container.appendChild(pane);

    // execute any scripts from the loaded template
    pane.querySelectorAll("script").forEach((oldScript) => {
      if (oldScript.src) {
        const exists = document.querySelector(
          `head script[src="${oldScript.getAttribute("src")}"]`,
        );
        if (exists) return oldScript.remove();
      }
      const clone = oldScript.cloneNode(true);
      document.head.appendChild(clone);
      oldScript.remove();
    });
  });
  sideNav.querySelectorAll(".open-tab").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      show(link.dataset.type);
      sideNav.classList.remove("open");
    });
  });

  const toggleBtn = document.getElementById("menuToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      sideNav.classList.toggle("open");
    });
  }
  document.addEventListener("click", (e) => {
    if (
      sideNav.classList.contains("open") &&
      !sideNav.contains(e.target) &&
      !(toggleBtn && toggleBtn.contains(e.target))
    ) {
      sideNav.classList.remove("open");
    }
  });
  const initialTab =
    new URLSearchParams(location.search).get("tab") || allowed[0] || "stations";
  show(initialTab);
});
