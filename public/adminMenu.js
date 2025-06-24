// JS for admin menu management

const UNIT_OPTIONS = (window.units || [])
  .map((u) => `<option value="${u.id}">${u.abbreviation}</option>`)
  .join("");

function serialize(form) {
  return new URLSearchParams(new FormData(form));
}

function showAlert(msg) {
  const alert = document.createElement("div");
  alert.className = "alert alert-success alert-dismissible fade show m-2";
  alert.role = "alert";
  alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  const screen = document.querySelector(".admin-screen");
  (screen || document.body).prepend(alert);
}

function handleForm(form, onSuccess) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const scroll = window.scrollY;
    fetch(form.action, {
      method: form.method || "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: serialize(form),
      redirect: "manual",
    })
      .then((res) => {
        let msg = null;
        if (res.headers.get("Location")) {
          const loc = new URL(
            res.headers.get("Location"),
            window.location.origin,
          );
          msg = loc.searchParams.get("msg");
        } else if (res.url) {
          try {
            msg = new URL(res.url).searchParams.get("msg");
          } catch {}
        }
        if (typeof onSuccess === "function") onSuccess();
        if (msg) {
          showAlert(decodeURIComponent(msg.replace(/\+/g, " ")));
          history.replaceState(null, "", window.location.pathname);
        }
        window.scrollTo(0, scroll);
      })
      .catch((err) => {
        console.error("Form submit failed", err);
        showAlert("Error saving");
      });
  });
}

function updateModReplaceOptions(form) {
  if (!form) return;
  const ings = window.publicIngredients || [];
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
  const ings = window.publicIngredients || [];
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
  const ings = window.publicIngredients || [];
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

  document.querySelectorAll(".open-recipe-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentForm = btn.closest("form");
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
        const ings = window.publicIngredients || [];
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
    });
  });

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

function bindForms() {
  document.querySelectorAll(".item-edit-form form").forEach((form) => {
    handleForm(form, () => {
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
    });
  });

  document.querySelectorAll(".category-edit-form form").forEach((form) => {
    handleForm(form, () => {
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
    });
  });

  document.querySelectorAll(".add-item-form form").forEach((form) => {
    handleForm(form, () => {
      // Reload to display the newly added item in its category
      window.location.reload();
    });
  });

  document
    .querySelectorAll('.mod-row form[action="/admin/modifiers"]')
    .forEach((form) => {
      handleForm(form, () => {
        showAlert("Modifier saved");
      });
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
  initCollapseText();
  initSearchFilter();
  initOptionSections();
  initPersistentModifierSection();
}

window.initAdminMenu = initAdminMenu;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminMenu);
} else {
  initAdminMenu();
}
