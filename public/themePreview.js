document.addEventListener("DOMContentLoaded", () => {
  const menuFrame = document.getElementById("menuPreview");
  const stationFrame = document.getElementById("stationPreview");
  const frames = [menuFrame, stationFrame].filter(Boolean);
  const form = document.querySelector("#themeForm form");
  const resetBtn = document.getElementById("resetPreview");
  const toggleBtn = document.getElementById("togglePreview");
  const tabContent = document.getElementById("previewTabContent");
  if (frames.length === 0 || !form) return;

  const highlightDuration = 1500;
  const highlight = (targets) => {
    const arr = Array.isArray(targets) ? targets : [targets];
    frames.forEach((f) => f.classList.remove("preview-highlight"));
    arr.filter(Boolean).forEach((f) => {
      f.classList.add("preview-highlight");
      setTimeout(() => f.classList.remove("preview-highlight"), highlightDuration);
    });
  };

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
    frames.forEach((frame) => {
      if (!frame.contentWindow || !frame.contentWindow.document) return;
      const doc = frame.contentWindow.document;
      const root = doc.documentElement.style;
      if (form.theme_primary_color)
        root.setProperty("--primary-color", form.theme_primary_color.value);
      if (form.theme_bg_color)
        root.setProperty("--bg-color", form.theme_bg_color.value);
      if (form.theme_wallpaper)
        root.setProperty(
          "--bg-image",
          form.theme_wallpaper.value
            ? `url(${form.theme_wallpaper.value})`
            : "none",
        );
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
      let styleEl = doc.getElementById("customCssPreview");
      if (!styleEl) {
        styleEl = doc.createElement("style");
        styleEl.id = "customCssPreview";
        doc.head.appendChild(styleEl);
      }
      styleEl.textContent = form.custom_css ? form.custom_css.value : "";
    });
  };

  const swatchContainer = document.getElementById("color-suggestions");
  if (swatchContainer) {
    swatchContainer.addEventListener("click", (e) => {
      const swatch = e.target.closest("[data-color]");
      if (!swatch) return;
      const targetId = swatch.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        input.value = swatch.dataset.color;
        saveToStorage();
        update();
      }
    });
  }

  form.addEventListener("input", () => {
    saveToStorage();
    update();
  });
  form.addEventListener("focusin", (e) => {
    const target = e.target;
    if (!target || !target.name) return;
    const pref = target.dataset.preview;
    if (pref === "menu") highlight(menuFrame);
    else if (pref === "station") highlight(stationFrame);
    else highlight(frames);
  });
  frames.forEach((f) => f.addEventListener("load", update));

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem(storageKey);
      form.reset();
      update();
    });
  }
  if (toggleBtn && tabContent) {
    toggleBtn.addEventListener("click", () => {
      const hidden = tabContent.classList.toggle("d-none");
      toggleBtn.textContent = hidden ? "Show Preview" : "Hide Preview";
    });
  }
});
