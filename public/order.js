const itemMap = {};
(window.MENU_CATS || []).forEach(cat => {
  (cat.items || []).forEach(it => {
    itemMap[it.id] = it;
  });
});
const modGroupMap = {};
(window.MOD_GROUPS || []).forEach(g => {
  modGroupMap[g.id] = g.name;
});
const cart = [];
const cartItemsEl = document.getElementById('cartItems');
const totalEl = document.getElementById('cartTotal');
const submitBtn = document.getElementById('submitBtn');
const orderTypeEl = document.getElementById('orderType');
function renderCart() {
  cartItemsEl.innerHTML = '';
  let total = 0;
  cart.forEach((c, idx) => {
    const li = document.createElement('li');
    let text = `${c.quantity}× ${c.name}`;
    if (c.modifierNames.length) text += ` (${c.modifierNames.join(', ')})`;
    li.textContent = text;
    total += c.quantity * (c.price || 0);
    const rm = document.createElement('button');
    rm.textContent = 'Remove';
    rm.className = 'btn ms-1';
    rm.addEventListener('click', () => {
      cart.splice(idx, 1);
      renderCart();
    });
    li.appendChild(rm);
    cartItemsEl.appendChild(li);
  });
  submitBtn.disabled = cart.length === 0;
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
}
function addToCart(itemId, modIds) {
  const item = itemMap[itemId];
  if (!item) return;
  const key = itemId + ':' + modIds.slice().sort().join(',');
  let entry = cart.find(c => c.key === key);
  const modNames = modIds.map(id => (item.modifiers.find(m => m.id === id) || {}).name).filter(Boolean);
  if (entry) {
    entry.quantity += 1;
  } else {
    cart.push({ key, itemId, name: item.name, price: item.price, modifierIds: modIds, modifierNames: modNames, quantity: 1 });
  }
  renderCart();
}
// modifier modal logic
let currentItem = null;
const modModal = document.getElementById('modModal');
const modTitle = document.getElementById('modTitle');
const modOptions = document.getElementById('modOptions');
const modConfirm = document.getElementById('modConfirm');
const modCancel = document.getElementById('modCancel');
modConfirm.addEventListener('click', () => {
  if (!currentItem) return;
  const chosen = Array.from(modOptions.querySelectorAll('input[type=checkbox]:checked')).map(cb => parseInt(cb.value, 10));
  addToCart(currentItem.id, chosen);
  modModal.classList.add('d-none');
});
modCancel.addEventListener('click', () => {
  modModal.classList.add('d-none');
});
function showModifierModal(item) {
  currentItem = item;
  modTitle.textContent = `Add ${item.name}`;
  modOptions.innerHTML = '';
  const groups = {};
  item.modifiers.forEach(m => {
    const gid = m.group_id || 'extras';
    if (!groups[gid]) groups[gid] = [];
    groups[gid].push(m);
  });
  Object.keys(groups).forEach(gid => {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'mod-group-label';
    labelDiv.textContent = gid === 'extras' ? 'Extras' : (modGroupMap[gid] || 'Options');
    modOptions.appendChild(labelDiv);
    groups[gid].forEach(m => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = m.id;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + m.name));
      modOptions.appendChild(label);
      modOptions.appendChild(document.createElement('br'));
    });
  });
  modModal.classList.remove('d-none');
  modModal.classList.add('d-flex');
}
// add button handlers
document.querySelectorAll('#menu .item-card .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = parseInt(btn.getAttribute('data-id'), 10);
    const item = itemMap[id];
    if (!item) return;
    if (item.modifiers && item.modifiers.length) {
      showModifierModal(item);
    } else {
      addToCart(id, []);
    }
  });
});
submitBtn.addEventListener('click', () => {
  const payload = {
    order_number: window.TABLE || null,
    order_type: orderTypeEl ? orderTypeEl.value : null,
    special_instructions:
    document.getElementById('instructions').value.trim() || null,
    allergy: document.getElementById('allergy').checked,
    items: cart.map(c => ({ menu_item_id: c.itemId, quantity: c.quantity, modifier_ids: c.modifierIds }))
  };
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      cart.length = 0;
      renderCart();
      document.getElementById('instructions').value = '';
      document.getElementById('allergy').checked = false;
      alert('Order placed!');
    })
    .catch(err => {
      console.error('Failed to submit order', err);
      alert('Error sending order');
    });
});
renderCart();
