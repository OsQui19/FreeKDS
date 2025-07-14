const script = document.currentScript;
let MENU_CATS = [];
let MOD_GROUPS = [];
let TABLE = null;
if (script) {
  try {
    MENU_CATS = JSON.parse(script.dataset.categories || '[]');
    MOD_GROUPS = JSON.parse(script.dataset['modGroups'] || '[]');
    TABLE = script.dataset.table || null;
  } catch (e) {
    console.warn('Failed to parse order data', e);
  }
}
const itemMap = {};
(MENU_CATS || []).forEach((cat) => {
  (cat.items || []).forEach((it) => {
    itemMap[it.id] = it;
  });
});
const modGroupMap = {};
(MOD_GROUPS || []).forEach((g) => {
  modGroupMap[g.id] = g.name;
});
const cart = [];
const cartItemsEl = document.getElementById("cartItems");
const totalEl = document.getElementById("cartTotal");
const submitBtn = document.getElementById("submitBtn");
const orderTypeEl = document.getElementById("orderType");
const toastEl = document.getElementById("orderToast");
const toastBodyEl = document.getElementById("orderToastBody");
const toastInstance = toastEl ? new bootstrap.Toast(toastEl) : null;

function showToast(message, isError = false) {
  if (!toastInstance) return;
  toastBodyEl.textContent = message;
  toastEl.classList.remove("text-bg-success", "text-bg-danger");
  toastEl.classList.add(isError ? "text-bg-danger" : "text-bg-success");
  toastInstance.show();
}
function renderCart() {
  cartItemsEl.innerHTML = "";
  let total = 0;
  cart.forEach((c, idx) => {
    const li = document.createElement("li");
    const infoSpan = document.createElement("span");
    let text = `${c.quantity}× ${c.name}`;
    if (c.modifierNames.length) text += ` (${c.modifierNames.join(", ")})`;
    if (c.allergy) {
      text += " [ALLERGY]";
      if (c.allergyDetails) text += ` (${c.allergyDetails})`;
    }
    if (c.instructions) text += ` - ${c.instructions}`;
    infoSpan.textContent = text;
    li.appendChild(infoSpan);
    total += c.quantity * (c.price || 0);
    const controls = document.createElement("span");
    const dec = document.createElement("button");
    dec.innerHTML = '<i class="bi bi-dash-lg"></i>';
    dec.className = "btn btn-primary btn-sm ms-1";
    dec.addEventListener("click", () => {
      if (c.quantity > 1) {
        c.quantity -= 1;
      } else {
        cart.splice(idx, 1);
      }
      renderCart();
    });
    const inc = document.createElement("button");
    inc.innerHTML = '<i class="bi bi-plus-lg"></i>';
    inc.className = "btn btn-primary btn-sm ms-1";
    inc.addEventListener("click", () => {
      c.quantity += 1;
      renderCart();
    });
    const rm = document.createElement("button");
    rm.innerHTML = '<i class="bi bi-trash"></i>';
    rm.className = "btn btn-danger btn-sm ms-1";
    rm.addEventListener("click", () => {
      cart.splice(idx, 1);
      renderCart();
    });
    controls.appendChild(dec);
    controls.appendChild(inc);
    controls.appendChild(rm);
    li.appendChild(controls);
    cartItemsEl.appendChild(li);
  });
  submitBtn.disabled = cart.length === 0;
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
}
function addToCart(itemId, modIds, instructions, allergy, allergyDetails) {
  const item = itemMap[itemId];
  if (!item) return;
  const modNames = modIds
    .map((id) => (item.modifiers.find((m) => m.id === id) || {}).name)
    .filter(Boolean);
  cart.push({
    itemId,
    name: item.name,
    price: item.price,
    modifierIds: modIds,
    modifierNames: modNames,
    quantity: 1,
    instructions: instructions || "",
    allergy: !!allergy,
    allergyDetails: allergyDetails || "",
  });
  renderCart();
}
// modifier modal logic
let currentItem = null;
const modModal = document.getElementById("modModal");
const modTitle = document.getElementById("modTitle");
const modOptions = document.getElementById("modOptions");
const modConfirm = document.getElementById("modConfirm");
const modCancel = document.getElementById("modCancel");
const modInstructions = document.getElementById("modInstructions");
const modAllergy = document.getElementById("modAllergy");
const modAllergyDetail = document.getElementById("modAllergyDetail");
const modAllergyDetailDiv = document.getElementById("modAllergyDetailDiv");
if (modAllergy) {
  modAllergy.addEventListener("change", () => {
    if (!modAllergyDetailDiv) return;
    modAllergyDetailDiv.classList.toggle("d-none", !modAllergy.checked);
  });
}
modConfirm.addEventListener("click", () => {
  if (!currentItem) return;
  const chosen = Array.from(
    modOptions.querySelectorAll("input[type=checkbox]:checked"),
  ).map((cb) => parseInt(cb.value, 10));
  const instr = modInstructions.value.trim();
  const allergy = modAllergy.checked;
  const allergyDesc = modAllergyDetail ? modAllergyDetail.value.trim() : "";
  addToCart(currentItem.id, chosen, instr, allergy, allergyDesc);
  modInstructions.value = "";
  modAllergy.checked = false;
  if (modAllergyDetail) modAllergyDetail.value = "";
  if (modAllergyDetailDiv) modAllergyDetailDiv.classList.add("d-none");
  modModal.classList.add("d-none");
});
modCancel.addEventListener("click", () => {
  modModal.classList.add("d-none");
  if (modAllergyDetail) modAllergyDetail.value = "";
  if (modAllergyDetailDiv) modAllergyDetailDiv.classList.add("d-none");
});
function showModifierModal(item) {
  currentItem = item;
  modTitle.textContent = `Add ${item.name}`;
  modOptions.innerHTML = "";
  modInstructions.value = "";
  modAllergy.checked = false;
  if (modAllergyDetail) modAllergyDetail.value = "";
  if (modAllergyDetailDiv) modAllergyDetailDiv.classList.add("d-none");
  const groups = {};
  item.modifiers.forEach((m) => {
    const gid = m.group_id || "extras";
    if (!groups[gid]) groups[gid] = [];
    groups[gid].push(m);
  });
  Object.keys(groups).forEach((gid) => {
    const labelDiv = document.createElement("div");
    labelDiv.className = "mod-group-label";
    labelDiv.textContent =
      gid === "extras" ? "Extras" : modGroupMap[gid] || "Options";
    modOptions.appendChild(labelDiv);
    groups[gid].forEach((m) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = m.id;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + m.name));
      modOptions.appendChild(label);
      modOptions.appendChild(document.createElement("br"));
    });
  });
  modModal.classList.remove("d-none");
  modModal.classList.add("d-flex");
}
// add button handlers
document.querySelectorAll("#menu .item-card .btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = parseInt(btn.getAttribute("data-id"), 10);
    const item = itemMap[id];
    if (!item) return;
    showModifierModal(item);
  });
});
submitBtn.addEventListener("click", () => {
  const payload = {
    order_number: TABLE || null,
    order_type: orderTypeEl ? orderTypeEl.value : null,
    items: cart.map((c) => ({
      menu_item_id: c.itemId,
      quantity: c.quantity,
      modifier_ids: c.modifierIds,
      special_instructions:
        [c.instructions, c.allergyDetails]
          .filter(Boolean)
          .join(" | ") || null,
      allergy: !!c.allergy,
    })),
  };
  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((data) => {
      cart.length = 0;
      renderCart();
      showToast("Order placed!");
    })
    .catch((err) => {
      console.error("Failed to submit order", err);
      showToast("Error sending order", true);
    });
});
renderCart();
