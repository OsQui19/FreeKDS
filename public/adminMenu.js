// JS for admin menu management
import { showAlert, handleForm } from '/adminUtils.js';
// Guard against double loading which can happen if this script is included
// more than once by mistake.
if (!window.__ADMIN_MENU_SCRIPT_LOADED__) {
  window.__ADMIN_MENU_SCRIPT_LOADED__ = true;

  const script =
    document.currentScript ||
    document.querySelector('script[data-units]');
  let PUBLIC_INGREDIENTS = [];
  let UNITS = [];
  if (script) {
    try {
      PUBLIC_INGREDIENTS = JSON.parse(script.dataset.ingredients || '[]');
      UNITS = JSON.parse(script.dataset.units || '[]');
    } catch (e) {
      console.warn('Failed to parse menu data', e);
    }
  }

  const UNIT_OPTIONS = (UNITS || [])
    .map((u) => `<option value="${u.id}">${u.abbreviation}</option>`)
    .join("");

  const ALERT_CONTAINER = document.querySelector('.admin-screen') || document.body;

function serialize(form) {
  return new URLSearchParams(new FormData(form));
}


function updateModReplaceOptions(form) {
  if (!form) return;
  const ings = PUBLIC_INGREDIENTS || [];
  const ingIds = Array.from(
    form.querySelectorAll('input[name="ingredient_ids"]'),
  )
    .map((i) => i.value)
    .filter(Boolean);
  form.querySelectorAll(".mod-replace-select").forEach((sel) => {
    const current = sel.value;
    const opts = ['<option value="">Adds</option>'];
    ingIds.forEach((id) => {
      const ing = ings.find((p) => String(p.id) === String(id));
      opts.push(`<option value="${id}">${ing ? ing.name : ""}</option>`);
    });
    sel.innerHTML = opts.join("");
    sel.value = ingIds.includes(current) ? current : "";
  });
}

function initModifierReplaceFields() {
  document
    .querySelectorAll(".item-edit-form form, .add-item-form form")
    .forEach((form) => {
      form.querySelectorAll(".mod-replace-select").forEach((sel) => {
        const box = sel
          .closest("label")
          .querySelector('input[name="modifier_ids"]');
        const toggle = () => {
          sel.disabled = !box.checked;
        };
        if (box) {
          box.addEventListener("change", toggle);
          toggle();
        }
      });
      updateModReplaceOptions(form);
    });
}

function initModifierFields() {
  const ings = PUBLIC_INGREDIENTS || [];
  const findByName = (name) =>
    ings.find((i) => i.name.toLowerCase() === name.toLowerCase());
  document
    .querySelectorAll('.mod-row form[action="/admin/modifiers"]')
    .forEach((form) => {
      const input = form.querySelector(".mod-name");
      const hidden = form.querySelector('input[name="ingredient_id"]');
      if (!input || !hidden) return;
      const setVal = () => {
        const ing = findByName(input.value.trim());
        if (ing) {
          hidden.value = ing.id;
          input.value = ing.name;
        } else {
          hidden.value = "";
        }
      };
      input.addEventListener("change", setVal);
      form.addEventListener("submit", (e) => {
        setVal();
        if (!hidden.value) {
          e.preventDefault();
          alert("Please select a valid ingredient for the modifier");
        }
      });
      setVal();
    });
}

function initIngredientFields() {
  const ings = PUBLIC_INGREDIENTS || [];
  if (!document.getElementById("ingredientsList")) {
    const dl = document.createElement("datalist");
    dl.id = "ingredientsList";
    dl.innerHTML = ings
      .map((i) => `<option value="${i.name}"></option>`)
      .join("");
    document.body.appendChild(dl);
  }
  const findByName = (name) =>
    ings.find((i) => i.name.toLowerCase() === name.toLowerCase());
  document.querySelectorAll(".ingredient-container").forEach((container) => {
    const rowsDiv = container.querySelector(".ingredient-rows");
    const addRow = () => {
      const div = document.createElement("div");
      div.className = "ingredient-row d-flex gap-2 mb-1 align-items-center";
      div.innerHTML =
        `<input class="form-control ingredient-name" list="ingredientsList" placeholder="Ingredient">` +
        `<input type="hidden" name="ingredient_ids">` +
        `<select class="form-select form-select-sm ingredient-unit-select" name="ingredient_unit_ids">${UNIT_OPTIONS}</select>` +
        `<input class="form-control" type="number" step="0.01" name="ingredient_amounts" value="0">` +
        `<button type="button" class="btn btn-secondary remove-ingredient-row">x</button>`;
      rowsDiv.appendChild(div);
    };
    container
      .querySelectorAll(".add-ingredient-row")
      .forEach((btn) => btn.addEventListener("click", addRow));
    rowsDiv.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-ingredient-row")) {
        e.target.parentElement.remove();
      }
    });
    rowsDiv.addEventListener("change", (e) => {
      if (e.target.classList.contains("ingredient-name")) {
        const row = e.target.closest(".ingredient-row");
        const hidden = row.querySelector('input[name="ingredient_ids"]');
        const unitSel = row.querySelector('select[name="ingredient_unit_ids"]');
        const ing = findByName(e.target.value.trim());
        if (ing) {
          hidden.value = ing.id;
          if (unitSel) unitSel.value = ing.unit_id || "";
        } else {
          e.target.value = "";
          hidden.value = "";
          if (unitSel) unitSel.value = "";
        }
      }
    });
  });
}

function initRecipeFields() {
  document.querySelectorAll(".recipe-container").forEach((container) => {
    const rowsDiv = container.querySelector(".recipe-rows");
    const input = container.querySelector(".recipe-input");
    const addBtn = container.querySelector(".add-recipe-row");
    const hidden = container.querySelector('input[name="recipe"]');
    const addRow = (text = "") => {
      const div = document.createElement("div");
      div.className = "recipe-row d-flex gap-2 mb-1";
      div.innerHTML =
        `<input class="form-control" type="text" name="recipe_steps" value="${text}">` +
        `<button type="button" class="btn btn-secondary remove-recipe-row">x</button>`;
      rowsDiv.appendChild(div);
    };
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (!input.value.trim()) return;
        addRow(input.value.trim());
        input.value = "";
      });
    }
    rowsDiv.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-recipe-row")) {
        e.target.parentElement.remove();
      }
    });
    const form = container.closest("form");
    if (form) {
      form.addEventListener("submit", () => {
        if (input.value.trim()) {
          addRow(input.value.trim());
          input.value = "";
        }
        const steps = Array.from(
          rowsDiv.querySelectorAll('input[name="recipe_steps"]'),
        )
          .map((i) => i.value.trim())
          .filter(Boolean);
        if (hidden) hidden.value = steps.join("\n");
      });
    }
  });
}

function initRecipeModal() {
  const modal = document.getElementById("addRecipeModal");
  if (!modal) return;
  const saveBtn = document.getElementById("recipeSave");
  const cancelBtn = document.getElementById("recipeCancel");
  let currentForm = null;

  const closeModal = () => {
    modal.classList.add("d-none");
    modal.classList.remove("d-flex");
  };

  const openModal = async (btn) => {
    currentForm = btn.closest("form");
    try {
      const res = await fetch("/admin/ingredients/list");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ingredients)) {
          PUBLIC_INGREDIENTS = data.ingredients;
          const dl = document.getElementById("ingredientsList");
          if (dl) {
            dl.innerHTML = PUBLIC_INGREDIENTS.map((i) => `<option value="${i.name}"></option>`).join("");
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh ingredient list", err);
    }
      const recipeRows = modal.querySelector(".recipe-rows");
      const ingRows = modal.querySelector(".ingredient-rows");
      recipeRows.innerHTML = "";
      ingRows.innerHTML = "";
      const input = modal.querySelector(".recipe-input");
      if (input) input.value = "";

      if (currentForm) {
        const recipeHidden = currentForm.querySelector('input[name="recipe"]');
        if (recipeHidden && recipeHidden.value.trim()) {
          recipeHidden.value.split(/\r?\n/).forEach((step) => {
            if (!step.trim()) return;
            const div = document.createElement("div");
            div.className = "recipe-row d-flex gap-2 mb-1";
            div.innerHTML =
              `<input class="form-control" type="text" name="recipe_steps" value="${step}">` +
              `<button type="button" class="btn btn-secondary remove-recipe-row">x</button>`;
            recipeRows.appendChild(div);
          });
        }

        const ids = Array.from(
          currentForm.querySelectorAll('input[name="ingredient_ids"]'),
        );
        const amts = Array.from(
          currentForm.querySelectorAll('input[name="ingredient_amounts"]'),
        );
        const units = Array.from(
          currentForm.querySelectorAll('input[name="ingredient_unit_ids"]'),
        );
        const ings = PUBLIC_INGREDIENTS || [];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i].value;
          if (!id) continue;
          const amt = amts[i] ? amts[i].value : "";
          const unitId = units[i] ? units[i].value : "";
          const ing = ings.find((p) => String(p.id) === String(id));
          const row = document.createElement("div");
          row.className = "ingredient-row d-flex gap-2 mb-1 align-items-center";
          row.innerHTML =
            `<input class="form-control ingredient-name" list="ingredientsList" value="${ing ? ing.name : ""}">` +
            `<input type="hidden" name="ingredient_ids" value="${id}">` +
            `<select class="form-select form-select-sm ingredient-unit-select" name="ingredient_unit_ids">${UNIT_OPTIONS}</select>` +
            `<input class="form-control" type="number" step="0.01" name="ingredient_amounts" value="${amt}">` +
            `<button type="button" class="btn btn-secondary remove-ingredient-row">x</button>`;
          const sel = row.querySelector('select[name="ingredient_unit_ids"]');
          if (sel) sel.value = unitId || (ing ? ing.unit_id : "");
          ingRows.appendChild(row);
        }
      }

    modal.classList.remove("d-none");
    modal.classList.add("d-flex");
  };

  document.querySelectorAll(".open-recipe-modal").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn));
  });

  window.attachRecipeModalButton = (btn) => {
    if (btn) btn.addEventListener("click", () => openModal(btn));
  };

  cancelBtn.addEventListener("click", closeModal);

  saveBtn.addEventListener("click", () => {
    if (!currentForm) return;
    const steps = Array.from(
      modal.querySelectorAll('.recipe-row input[name="recipe_steps"]'),
    )
      .map((i) => i.value.trim())
      .filter(Boolean);
    const recipeHidden = currentForm.querySelector('input[name="recipe"]');
    if (recipeHidden) recipeHidden.value = steps.join("\n");

    const hiddenBox = currentForm.querySelector(".hidden-ingredients");
    if (hiddenBox) hiddenBox.innerHTML = "";
    modal.querySelectorAll(".ingredient-row").forEach((row) => {
      const idField = row.querySelector('input[name="ingredient_ids"]');
      const id = idField ? idField.value : "";
      const amt = row.querySelector('input[name="ingredient_amounts"]').value;
      const unitField = row.querySelector('select[name="ingredient_unit_ids"]');
      const unitId = unitField ? unitField.value : "";
      if (!id) return;
      const idInput = document.createElement("input");
      idInput.type = "hidden";
      idInput.name = "ingredient_ids";
      idInput.value = id;
      const amtInput = document.createElement("input");
      amtInput.type = "hidden";
      amtInput.name = "ingredient_amounts";
      amtInput.value = amt;
      const unitInput = document.createElement("input");
      unitInput.type = "hidden";
      unitInput.name = "ingredient_unit_ids";
      unitInput.value = unitId;
      hiddenBox.appendChild(idInput);
      hiddenBox.appendChild(unitInput);
      hiddenBox.appendChild(amtInput);
    });

    updateModReplaceOptions(currentForm);

    closeModal();
    if (typeof currentForm.requestSubmit === "function") {
      currentForm.requestSubmit();
    } else {
      const evt = new Event("submit", { cancelable: true });
      currentForm.dispatchEvent(evt);
    }
  });
}

function initDragAndDrop() {
  if (typeof Sortable === "undefined") return;
  new Sortable(document.getElementById("categories-container"), {
    handle: ".category-header .drag-handle",
    draggable: ".category-section",
    animation: 150,
    onEnd() {
      const newOrder = Array.from(
        document.querySelectorAll("#categories-container .category-section"),
      ).map((sec) => sec.getAttribute("data-category-id"));
      fetch("/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      }).then(() => {
        const frame = document.getElementById("menuPreview");
        if (frame) frame.contentWindow.location.reload();
      });
    },
  });

  document.querySelectorAll(".item-list").forEach((listEl) => {
    new Sortable(listEl, {
      handle: ".item-view .drag-handle",
      draggable: ".menu-item",
      animation: 150,
      onEnd() {
        const catId = listEl.getAttribute("data-category-id");
        const newOrder = Array.from(listEl.querySelectorAll(".menu-item")).map(
          (li) => li.getAttribute("data-item-id"),
        );
        fetch("/admin/items/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: catId, order: newOrder }),
        }).then(() => {
          const frame = document.getElementById("menuPreview");
          if (frame) frame.contentWindow.location.reload();
        });
      },
    });
  });
}

function initEditToggles() {
  document.querySelectorAll(".edit-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li");
      li.querySelector(".item-view").classList.add("hidden");
      li.querySelector(".item-edit-form").classList.remove("hidden");
    });
  });
  document.querySelectorAll(".cancel-item-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li");
      li.querySelector(".item-edit-form").classList.add("hidden");
      li.querySelector(".item-view").classList.remove("hidden");
    });
  });
  document.querySelectorAll(".edit-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const header = btn.closest(".category-header");
      const collapse = header.nextElementSibling;
      const form = collapse.querySelector(".category-edit-form");
      header.classList.add("hidden");
      if (collapse && !collapse.classList.contains("show"))
        collapse.classList.add("show");
      if (form) form.classList.remove("hidden");
    });
  });
  document.querySelectorAll(".cancel-cat-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".category-edit-form");
      const collapse = form.closest(".collapse");
      form.classList.add("hidden");
      if (collapse) collapse.classList.remove("show");
      if (collapse && collapse.previousElementSibling)
        collapse.previousElementSibling.classList.remove("hidden");
    });
  });
}

function initCollapseText() {
  document.querySelectorAll(".toggle-items-btn").forEach((btn) => {
    const target = document.querySelector(btn.getAttribute("data-bs-target"));
    if (!target) return;
    const updateText = () => {
      btn.textContent = target.classList.contains("show")
        ? "Hide Items"
        : "Show Items";
    };
    updateText();
    target.addEventListener("hidden.bs.collapse", updateText);
    target.addEventListener("shown.bs.collapse", updateText);
  });
}

function initSearchFilter() {
  const searchInput = document.getElementById("itemSearch");
  if (!searchInput) return;
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    document.querySelectorAll(".menu-item").forEach((li) => {
      const name = li.querySelector(".item-name").textContent.toLowerCase();
      li.style.display = name.includes(term) ? "" : "none";
    });
  });
}

function initOptionSections() {
  const optionSections = [
    { id: "newCategoryForm", show: "Show Form", hide: "Hide Form" },
    { id: "groupSection", show: "Show Groups", hide: "Hide Groups" },
    { id: "modifierSection", show: "Show Modifiers", hide: "Hide Modifiers" },
  ];
  optionSections.forEach((sec) => {
    const el = document.getElementById(sec.id);
    const btn = document.querySelector(`button[data-bs-target="#${sec.id}"]`);
    if (el && btn) {
      const update = () => {
        btn.textContent = el.classList.contains("show") ? sec.hide : sec.show;
      };
      update();
      el.addEventListener("shown.bs.collapse", update);
      el.addEventListener("hidden.bs.collapse", update);
    }
  });
}

function initPersistentModifierSection() {
  const modSection = document.getElementById("modifierSection");
  if (!modSection) return;
  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.get("openMods") === "1" ||
    localStorage.getItem("modifierSectionExpanded") === "true"
  ) {
    modSection.classList.add("show");
  }
  modSection.addEventListener("shown.bs.collapse", () => {
    localStorage.setItem("modifierSectionExpanded", "true");
  });
  modSection.addEventListener("hidden.bs.collapse", () => {
    localStorage.setItem("modifierSectionExpanded", "false");
  });
}

function initCategoryCollapseState() {
  document.querySelectorAll(".category-section").forEach((section) => {
    const id = section.getAttribute("data-category-id");
    if (!id) return;
    const key = `category-${id}`;
    const body = section.querySelector(`#catBody-${id}`);
    if (!body) return;
    const stored = localStorage.getItem(key);
    if (stored === "true") {
      body.classList.add("show");
    }
    body.addEventListener("shown.bs.collapse", () => {
      localStorage.setItem(key, "true");
    });
    body.addEventListener("hidden.bs.collapse", () => {
      localStorage.setItem(key, "false");
    });
  });
}

function bindForms() {
  document.querySelectorAll(".item-edit-form form").forEach((form) => {
    handleForm(
      form,
      () => {
      const li = form.closest("li.menu-item");
      if (!li) return;
      li.querySelector(".item-name").textContent = form.elements.name.value;
      li.querySelector(".item-price").textContent =
        "$" + parseFloat(form.elements.price.value).toFixed(2);
      const stSel = form.elements.station_id;
      if (stSel) {
        li.querySelector(".item-station").textContent =
          stSel.options[stSel.selectedIndex].textContent;
      }
      const modNames = Array.from(
        form.querySelectorAll('input[name="modifier_ids"]:checked'),
      ).map((cb) => cb.parentNode.textContent.trim());
      li.querySelector(".item-mods").textContent = modNames.length
        ? "Extras: " + modNames.join(", ")
        : "Extras: None";
      const recHidden = form.querySelector('input[name="recipe"]');
      if (recHidden) {
        li.querySelector(".item-recipe").textContent =
          "Recipe: " + (recHidden.value.trim() ? "Yes" : "No");
      }
      li.querySelector(".item-edit-form").classList.add("hidden");
      li.querySelector(".item-view").classList.remove("hidden");
    },
    { alertContainer: ALERT_CONTAINER },
    );
  });

  document.querySelectorAll(".category-edit-form form").forEach((form) => {
    handleForm(
      form,
      () => {
      const id = form.elements.id.value;
      const section = document.querySelector(
        `.category-section[data-category-id="${id}"]`,
      );
      if (section) {
        section.querySelector(".category-name-view").textContent =
          form.elements.name.value;
        section.querySelector(".category-edit-form").classList.add("hidden");
        section.querySelector(".category-header").classList.remove("hidden");
      }
    },
    { alertContainer: ALERT_CONTAINER },
    );
  });

  document.querySelectorAll(".add-item-form form").forEach((form) => {
    handleForm(
      form,
      async (res) => {
      let data = null;
      if (
        res &&
        res.headers.get("content-type") &&
        res.headers.get("content-type").includes("application/json")
      ) {
        try {
          data = await res.json();
        } catch {}
      }
      if (!data || !data.item) {
        window.location.reload();
        return;
      }
      const item = data.item;
      const list = form.closest(".item-list");
      const template = document.querySelector(".menu-item");
      if (!list || !template) {
        window.location.reload();
        return;
      }
      const li = template.cloneNode(true);
      li.setAttribute("data-item-id", item.id);
      li.querySelector(".item-id").textContent = `ID: ${item.id}`;
      li.querySelector(".item-name").textContent = item.name;
      li.querySelector(".item-price").textContent =
        "$" + Number(item.price).toFixed(2);
      const img = li.querySelector(".item-view img");
      if (img) img.src = item.image_url ? item.image_url : "/no-image-60.png";
      const stationSel = li.querySelector(
        '.item-edit-form select[name="station_id"]',
      );
      let stationName = "";
      if (stationSel) {
        stationSel.value = item.station_id;
        const opt = stationSel.querySelector(
          `option[value="${item.station_id}"]`,
        );
        if (opt) stationName = opt.textContent;
      }
      li.querySelector(
        ".item-station",
      ).textContent = `Station: ${stationName}`;
      const catSel = li.querySelector(
        '.item-edit-form select[name="category_id"]',
      );
      if (catSel) catSel.value = item.category_id;
      li.querySelector(
        '.item-edit-form input[name="name"]',
      ).value = item.name;
      li.querySelector(
        '.item-edit-form input[name="price"]',
      ).value = item.price;
      const imgInput = li.querySelector(
        '.item-edit-form input[name="image_url"]',
      );
      if (imgInput) imgInput.value = item.image_url || "";
      const idInput = li.querySelector('.item-edit-form input[name="id"]');
      if (idInput) idInput.value = item.id;
      const recHidden = li.querySelector(
        '.item-edit-form input[name="recipe"]',
      );
      if (recHidden) recHidden.value = item.recipe || "";
      li.querySelector(".item-recipe").textContent =
        "Recipe: " + (item.recipe && item.recipe.trim() ? "Yes" : "No");
      li.querySelector(".item-mods").textContent =
        item.modifierNamesStr ? `Extras: ${item.modifierNamesStr}` : "Extras: None";
      li
        .querySelectorAll('.item-edit-form input[name="modifier_ids"]')
        .forEach((cb) => {
          cb.checked = false;
        });
      li
        .querySelectorAll(
          '.item-edit-form select.mod-replace-select',
        )
        .forEach((sel) => {
          sel.value = "";
          sel.disabled = true;
        });
      const grpSel = li.querySelector(
        '.item-edit-form select[name="group_ids"]',
      );
      if (grpSel)
        Array.from(grpSel.options).forEach((o) => (o.selected = false));
      const hidBox = li.querySelector(
        '.item-edit-form .hidden-ingredients',
      );
      if (hidBox) hidBox.innerHTML = "";
      list.insertBefore(li, form.closest("li.add-item-form"));
      form.reset();
      const hiddenBox = form.querySelector(".hidden-ingredients");
      if (hiddenBox) hiddenBox.innerHTML = "";
      updateModReplaceOptions(form);
      if (typeof window.attachRecipeModalButton === "function")
        window.attachRecipeModalButton(li.querySelector(".open-recipe-modal"));
      li.querySelectorAll('form[data-confirm]').forEach((f) => {
        f.addEventListener('submit', (e) => {
          const msg = f.getAttribute('data-confirm');
          if (msg && !window.confirm(msg)) e.preventDefault();
        });
      });
      handleForm(
        li.querySelector('.item-edit-form form'),
        () => {
        const liEl = li;
        const formEl = liEl.querySelector('.item-edit-form form');
        liEl.querySelector('.item-name').textContent = formEl.elements.name.value;
        liEl.querySelector('.item-price').textContent =
          '$' + parseFloat(formEl.elements.price.value).toFixed(2);
        const stSel2 = formEl.elements.station_id;
        if (stSel2) {
          liEl.querySelector('.item-station').textContent =
            stSel2.options[stSel2.selectedIndex].textContent;
        }
        const modNames = Array.from(
          formEl.querySelectorAll('input[name="modifier_ids"]:checked'),
        ).map((cb) => cb.parentNode.textContent.trim());
        liEl.querySelector('.item-mods').textContent = modNames.length
          ? 'Extras: ' + modNames.join(', ')
          : 'Extras: None';
        const recHidden2 = formEl.querySelector('input[name="recipe"]');
        if (recHidden2) {
          liEl.querySelector('.item-recipe').textContent =
            'Recipe: ' + (recHidden2.value.trim() ? 'Yes' : 'No');
        }
        liEl.querySelector('.item-edit-form').classList.add('hidden');
        liEl.querySelector('.item-view').classList.remove('hidden');
      },
      { alertContainer: ALERT_CONTAINER },
      );
      li.querySelector('.edit-item-btn').addEventListener('click', () => {
        li.querySelector('.item-view').classList.add('hidden');
        li.querySelector('.item-edit-form').classList.remove('hidden');
      });
      li.querySelector('.cancel-item-edit').addEventListener('click', () => {
        li.querySelector('.item-edit-form').classList.add('hidden');
        li.querySelector('.item-view').classList.remove('hidden');
      });
    },
    { alertContainer: ALERT_CONTAINER },
    );
  });

  document
    .querySelectorAll('.mod-row form[action="/admin/modifiers"]')
    .forEach((form) => {
      handleForm(form, () => {
        showAlert("Modifier saved", 'success', ALERT_CONTAINER);
      }, { alertContainer: ALERT_CONTAINER });
    });
}

function initAdminMenu() {
  initIngredientFields();
  initRecipeFields();
  initModifierFields();
  initModifierReplaceFields();
  initRecipeModal();
  bindForms();
  initDragAndDrop();
  initEditToggles();
  initCategoryCollapseState();
  initCollapseText();
  initSearchFilter();
  initOptionSections();
  initPersistentModifierSection();
}

window.initAdminMenu = initAdminMenu;

if (!window.__ADMIN_MENU_INITED__) {
  window.__ADMIN_MENU_INITED__ = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminMenu);
  } else {
    initAdminMenu();
  }
}

} // end guard
