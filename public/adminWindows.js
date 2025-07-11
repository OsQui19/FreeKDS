function startAdminWindows() {
  if (window.adminWindowsInitialized) {
    const allowed = window.adminAllowedModules || [];
    const initialTab =
      new URLSearchParams(location.search).get("tab") || allowed[0] || "stations";
    if (typeof window.adminShowTab === "function") {
      window.adminShowTab(initialTab);
    }
    return;
  }
  window.adminWindowsInitialized = true;
  const sideNav = document.getElementById("sideNav");
  const container = document.getElementById("windowsContainer");
  const script = document.querySelector('script[data-modules]');
  let allowed = [];
  if (script) {
    try {
      allowed = JSON.parse(script.dataset.modules || '[]');
    } catch (e) {
      console.warn('Failed to parse allowed modules', e);
    }
  }
  window.adminAllowedModules = allowed;
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
    const url = new URL(window.location);
    url.searchParams.set("tab", type);
    history.replaceState(null, "", url);
    document.dispatchEvent(new CustomEvent("adminTabShown", { detail: type }));
    if (type === "reports" && typeof window.initReportsTab === "function") {
      window.initReportsTab();
    }
  }
  window.adminShowTab = show;

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
      const clone = document.createElement("script");
      for (const attr of oldScript.attributes) {
        if (attr.name !== "defer") clone.setAttribute(attr.name, attr.value);
      }
      clone.textContent = oldScript.textContent;
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
}

document.addEventListener("DOMContentLoaded", startAdminWindows);
// Reinitialize when returning via bfcache or navigating to the same page
window.addEventListener("pageshow", () => {
  if (document.visibilityState === "visible") {
    startAdminWindows();
  }
});
