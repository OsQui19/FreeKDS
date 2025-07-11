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
  const sideNav = document.getElementById("sideNav");
  const container = document.getElementById("windowsContainer");
  if (!sideNav || !container) {
    console.error("Admin layout missing sideNav or container");
    return;
  }
  const script = document.querySelector('script[data-modules]');
  let allowed = [];
  if (script) {
    try {
      allowed = JSON.parse(script.dataset.modules || "[]");
    } catch (e) {
      console.error("Failed to parse allowed modules", e);
      allowed = [];
    }
  }
  window.adminWindowsInitialized = true;
  window.adminAllowedModules = allowed;
  const templates = {};
  allowed.forEach((m) => {
    const el = document.getElementById(`tpl-${m}`);
    if (el) {
      templates[m] = el.innerHTML;
      el.remove();
    }
  });
  container.querySelectorAll(".admin-window").forEach((el) => el.remove());

  function loadScripts(scripts, attempts = 3, delay = 1000) {
    return Promise.all(
      scripts.map((oldScript) => {
        if (oldScript.src) {
          const src = oldScript.getAttribute("src");
          if (document.querySelector(`head script[src="${src}"]`)) {
            oldScript.remove();
            return Promise.resolve();
          }
          return new Promise((resolve, reject) => {
            const attempt = (n) => {
              const script = document.createElement("script");
              for (const attr of oldScript.attributes) {
                if (attr.name !== "defer")
                  script.setAttribute(attr.name, attr.value);
              }
              script.onload = resolve;
              script.onerror = () => {
                script.remove();
                if (n > 1) {
                  setTimeout(() => attempt(n - 1), delay);
                } else {
                  reject(new Error(`Failed to load ${src}`));
                }
              };
              document.head.appendChild(script);
            };
            attempt(attempts);
          }).finally(() => {
            oldScript.remove();
          });
        } else {
          const clone = document.createElement("script");
          for (const attr of oldScript.attributes) {
            if (attr.name !== "defer") clone.setAttribute(attr.name, attr.value);
          }
          clone.textContent = oldScript.textContent;
          document.head.appendChild(clone);
          oldScript.remove();
          return Promise.resolve();
        }
      })
    );
  }

  const panes = {};
  allowed.forEach((type) => {
    const pane = document.createElement("section");
    pane.className = "admin-window";
    pane.dataset.type = type;
    pane.dataset.loaded = "false";
    container.appendChild(pane);
    panes[type] = pane;
  });
  async function loadPane(type) {
    const pane = panes[type];
    if (!pane || pane.dataset.loaded === "true") return;
    pane.innerHTML = templates[type] || "";
    const scripts = Array.from(pane.querySelectorAll("script"));
    pane.dataset.loaded = "true";
    try {
      await loadScripts(scripts);
    } catch (err) {
      console.error(err);
      alert(`Failed to load scripts for ${type}`);
    }
  }

  async function show(type) {
    const hide = window.showSpinner ? window.showSpinner() : () => {};
    await loadPane(type);
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
    if (typeof hide === "function") hide();
  }

  window.adminShowTab = show;
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
