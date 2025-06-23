// JS for inventory management

function initAdminInventory() {
  function serialize(form) {
    return new URLSearchParams(new FormData(form));
  }
  function handleForm(form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      fetch(form.action, {
        method: form.method || "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: serialize(form),
        redirect: "manual",
      }).then(() => {
        history.replaceState(null, "", window.location.pathname);
        location.reload();
      });
    });
  }
  document
    .querySelectorAll(
      ".ingredient-list form, .category-list form, #transaction-form",
    )
    .forEach(handleForm);

  const logForm = document.getElementById("logRangeForm");
  if (logForm) {
    logForm.addEventListener("submit", (e) => {
      e.preventDefault();
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminInventory);
} else {
  initAdminInventory();
}
