(function () {
  const cards = document.querySelectorAll('.item-card');
  if (!cards.length) return;

  const editModalEl = document.getElementById('editModal');
  if (!editModalEl) return;
  const editModal = new bootstrap.Modal(editModalEl);
  const editTitle = document.getElementById('editTitle');
  const priceInput = document.getElementById('editPrice');
  const qtyInput = document.getElementById('editQty');
  const eightySixBtn = document.getElementById('edit86Btn');
  const saveBtn = document.getElementById('editSave');
  let currentCard = null;

  function openEditModal(card) {
    currentCard = card;
    const nameEl = card.querySelector('.item-name');
    if (nameEl) editTitle.textContent = `Edit ${nameEl.textContent}`;
    priceInput.value = card.dataset.price || '';
    qtyInput.value = card.dataset.qty || '';
    if (eightySixBtn) eightySixBtn.disabled = card.dataset.eightySix === 'true';
    editModal.show();
  }

  function refreshDisplay(card) {
    const price = parseFloat(card.dataset.price) || 0;
    const qty = parseInt(card.dataset.qty, 10);
    const is86 = card.dataset.eightySix === 'true';
    const priceEl = card.querySelector('.item-price');
    if (priceEl) priceEl.textContent = `$${price.toFixed(2)}`;
    const qtyEl = card.querySelector('.item-qty');
    if (qtyEl) qtyEl.textContent = qty ? `Qty: ${qty}` : '';
    const btn = card.querySelector('button');
    if (btn) btn.disabled = is86 || qty === 0;
    card.classList.toggle('item-86', is86 || qty === 0);
  }

  saveBtn.addEventListener('click', () => {
    if (!currentCard) return;
    const price = parseFloat(priceInput.value) || 0;
    const qty = parseInt(qtyInput.value, 10) || 0;
    currentCard.dataset.price = price.toFixed(2);
    currentCard.dataset.qty = qty;
    const id = currentCard.dataset.id;
    if (itemMap[id]) itemMap[id].price = price;
    refreshDisplay(currentCard);
    currentCard = null;
    editModal.hide();
  });

  if (eightySixBtn) {
    eightySixBtn.addEventListener('click', () => {
      if (!currentCard) return;
      const id = currentCard.dataset.id;
      fetch(`/api/menu-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: 0 }),
      })
        .then(() => {
          currentCard.dataset.eightySix = 'true';
          refreshDisplay(currentCard);
          currentCard = null;
          editModal.hide();
        })
        .catch((err) => console.error('Failed to 86 item', err));
    });
  }

  function setupLongPress(card) {
    let timer = null;
    const start = (e) => {
      e.preventDefault();
      timer = setTimeout(() => openEditModal(card), 800);
    };
    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    card.addEventListener('mousedown', start);
    card.addEventListener('touchstart', start);
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((ev) =>
      card.addEventListener(ev, cancel),
    );
  }

  cards.forEach(setupLongPress);
})();
