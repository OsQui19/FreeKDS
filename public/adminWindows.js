document.addEventListener("DOMContentLoaded", () => {
  const sideNav = document.getElementById("sideNav");
  const container = document.getElementById("windowsContainer");
  const templates = {
    stations: document.getElementById("tpl-stations").innerHTML,
    menu: document.getElementById("tpl-menu").innerHTML,
    theme: document.getElementById("tpl-theme").innerHTML,
    inventory: document.getElementById("tpl-inventory").innerHTML,
  };
  function show(type) {
    sideNav.querySelectorAll(".nav-link").forEach((l) => {
      l.classList.toggle("active", l.dataset.type === type);
    });
    container.querySelectorAll(".admin-window").forEach((p) => {
      p.classList.toggle("active", p.dataset.type === type);
    });
  }

  ["stations", "menu", "theme", "inventory"].forEach((type) => {
    const pane = document.createElement("section");
    pane.className = "admin-window";
    pane.dataset.type = type;
    pane.innerHTML = templates[type] || "";

    // append pane before executing embedded scripts so DOM elements exist
    container.appendChild(pane);

    // execute any scripts from the loaded template
    pane.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      document.head.appendChild(newScript);
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
    new URLSearchParams(location.search).get("tab") || "stations";
  show(initialTab);
});
