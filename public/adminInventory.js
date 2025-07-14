// JS for inventory management

function initAdminInventory() {
  const script = document.querySelector('script[data-ingredients]');
  let inventoryIngredients = [];
  if (script) {
    try {
      inventoryIngredients = JSON.parse(script.dataset.ingredients || '[]');
    } catch (e) {
      console.warn('Failed to parse ingredient data', e);
    }
  }
  function serialize(form) {
    return new URLSearchParams(new FormData(form));
  }
  function showAlert(msg) {
    const alert = document.createElement("div");
    alert.className = "alert alert-danger alert-dismissible fade show m-2";
    alert.role = "alert";
    alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    const pane = document.getElementById("usageLogPane") || document.body;
    pane.prepend(alert);
  }
  function handleForm(form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resp = await fetch(form.action, {
        method: form.method || "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: serialize(form),
        redirect: "follow",
      });
      if (resp.redirected) {
        window.location.href = resp.url;
      } else {
        location.reload();
      }
    });
  }
  document
    .querySelectorAll(
      ".ingredient-list form, #transaction-form",
    )
    .forEach(handleForm);

  const logForm = document.getElementById("logRangeForm");
  if (logForm) {
    const submitBtn = logForm.querySelector('button[type="submit"]');
    logForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (submitBtn) submitBtn.disabled = true;
      fetch(`/admin/inventory/logs?${serialize(logForm)}`)
        .then((r) => r.json())
        .then((data) => {
          const tbody = document.querySelector("#usageLogPane tbody");
          tbody.innerHTML = data.logs
            .map(
              (l) => `
            <tr>
              <td>${new Date(l.created_at).toLocaleString()}</td>
              <td>${l.order_id}</td>
              <td>${l.item_name}</td>
              <td>${l.ingredient_name}</td>
              <td>${l.amount} ${l.unit || ""}</td>
            </tr>`,
            )
            .join("");
        })
        .catch(() => {
          showAlert("Couldn't load usage log");
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  const catFilter = document.getElementById("filterCategory");
  const tagFilter = document.getElementById("filterTag");
  const rows = document.querySelectorAll(".ingredient-table tbody tr");

  function applyFilter() {
    const cat = catFilter ? catFilter.value : "";
    const tag = tagFilter ? tagFilter.value : "";
    rows.forEach((row) => {
      if (row.classList.contains("add-row")) {
        row.style.display = "";
        return;
      }
      const rowCat = row.dataset.category || "";
      const rowTags = row.dataset.tags || "";
      const catMatch = !cat || rowCat === cat;
      const tagMatch = !tag || rowTags.includes(tag);
      row.style.display = catMatch && tagMatch ? "" : "none";
    });
  }
  if (catFilter) catFilter.addEventListener("change", applyFilter);
  if (tagFilter) tagFilter.addEventListener("change", applyFilter);
  applyFilter();

  function initQuickAdd() {
    const ings = inventoryIngredients || [];
    const findByName = (name) =>
      ings.find((i) => i.name.toLowerCase() === name.toLowerCase());
    const form = document.getElementById("quickAddForm");
    if (!form) return;
    const nameInput = document.getElementById("quickAddName");
    const idField = document.getElementById("quickAddId");
    const qtyInput = document.getElementById("quickAddQty");
    const btn = document.getElementById("quickAddBtn");

    const setId = () => {
      const ing = findByName(nameInput.value.trim());
      idField.value = ing ? ing.id : "";
    };

    nameInput.addEventListener("input", setId);
    form.addEventListener("submit", (e) => {
      setId();
      if (!idField.value) {
        e.preventDefault();
        alert("Please select a valid inventory item");
      }
    });
  }

  initQuickAdd();

  function initAddCategoryModal() {
    const btn = document.getElementById("addCategoryBtn");
    const modal = document.getElementById("addCategoryModal");
    const cancel = document.getElementById("addCategoryCancel");
    const form = document.getElementById("addCategoryForm");
    if (!btn || !modal || !form || !cancel) return;

    const close = () => {
      modal.classList.add("d-none");
      modal.classList.remove("d-flex");
    };

    btn.addEventListener("click", () => {
      modal.classList.remove("d-none");
      modal.classList.add("d-flex");
    });
    cancel.addEventListener("click", close);
    handleForm(form);
  }

  initAddCategoryModal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminInventory);
} else {
  initAdminInventory();
}
