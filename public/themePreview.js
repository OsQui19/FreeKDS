document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById("menuPreview");
  const form = document.querySelector("#themeForm form");
  const resetBtn = document.getElementById("resetPreview");
  const toggleBtn = document.getElementById("togglePreview");
  if (!frame || !form) return;

  const storageKey = "themePreviewSettings";

  const saveToStorage = () => {
    const data = {};
    Array.from(form.elements).forEach((el) => {
      if (el.name) data[el.name] = el.value;
    });
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const loadFromStorage = () => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (data) {
        Object.keys(data).forEach((k) => {
          if (form[k]) form[k].value = data[k];
        });
      }
    } catch (e) {
      console.warn("Failed to load preview settings", e);
    }
  };
  loadFromStorage();

  const update = () => {
    if (!frame.contentWindow || !frame.contentWindow.document) return;
    const doc = frame.contentWindow.document;
    const root = doc.documentElement.style;
    if (form.theme_primary_color)
      root.setProperty("--primary-color", form.theme_primary_color.value);
    if (form.theme_bg_color)
      root.setProperty("--bg-color", form.theme_bg_color.value);
    if (form.font_family)
      root.setProperty("--font-family", form.font_family.value);
    if (form.text_color)
      root.setProperty("--text-color", form.text_color.value);
    if (form.button_radius)
      root.setProperty("--button-radius", form.button_radius.value + "px");
    if (form.card_shadow)
      root.setProperty("--card-shadow", form.card_shadow.value);
    if (form.menu_layout) {
      const layout = form.menu_layout.value || "grid";
      root.setProperty("--menu-layout", layout);
      doc.body.classList.remove("menu-layout-grid", "menu-layout-list");
      doc.body.classList.add("menu-layout-" + layout);
    }
    // custom css
    let styleEl = doc.getElementById("customCssPreview");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "customCssPreview";
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = form.custom_css ? form.custom_css.value : "";
  };

  form.addEventListener("input", () => {
    saveToStorage();
    update();
  });
  frame.addEventListener("load", update);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem(storageKey);
      form.reset();
      update();
    });
  }
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      frame.classList.toggle("d-none");
      toggleBtn.textContent = frame.classList.contains("d-none")
        ? "Show Preview"
        : "Hide Preview";
    });
  }
});
