// order-ui.js — progressive enhancement for mobile cart + tiny UX touches
// Works with your existing /order.ejs and order.css. No renames.

(function(){
  const d = document;
  const cart = d.getElementById('cart');
  if (!cart) return;

  // Ensure a mobile "View Order" button exists; create if missing
  let toggleBtn = d.getElementById('toggleCartBtn');
  if (!toggleBtn) {
    toggleBtn = d.createElement('button');
    toggleBtn.id = 'toggleCartBtn';
    toggleBtn.className = 'btn btn-primary d-md-none position-fixed bottom-0 start-50 translate-middle-x mb-3';
    toggleBtn.innerHTML = 'View Order (<span id="cartTotalBtn">$0.00</span>)';
    d.body.appendChild(toggleBtn);
  }

  // Ensure a close button exists inside cart for mobile overlay
  let closeBtn = cart.querySelector('.btn-close');
  if (!closeBtn) {
    closeBtn = d.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close d-md-none';
    closeBtn.setAttribute('aria-label', 'Close');
    cart.appendChild(closeBtn);
  }

  // Toggle handlers
  const openCart = () => {
    cart.classList.add('open'); // CSS from order.additions.css handles visibility
    d.documentElement.style.overflow = 'hidden';
    d.body.style.overflow = 'hidden';
    // focus the cart heading if present
    const h = cart.querySelector('h3');
    if (h) h.setAttribute('tabindex', '-1'), h.focus();
  };
  const closeCart = () => {
    cart.classList.remove('open');
    d.documentElement.style.overflow = '';
    d.body.style.overflow = '';
    toggleBtn.focus();
  };

  toggleBtn.addEventListener('click', openCart);
  closeBtn.addEventListener('click', closeCart);

  // Keep the button total synced with #cartTotal
  const cartTotalEl = d.getElementById('cartTotal');
  const cartTotalBtnEl = d.getElementById('cartTotalBtn');
  if (cartTotalEl && cartTotalBtnEl) {
    const sync = () => { cartTotalBtnEl.textContent = cartTotalEl.textContent; };
    sync();
    // Observe any text changes to cart total
    const mo = new MutationObserver(sync);
    mo.observe(cartTotalEl, { childList: true, characterData: true, subtree: true });
  }

  // Improve category nav: ensure it can scroll horizontally on mobile (CSS does most of it)
  const catNav = d.getElementById('categoryNav');
  if (catNav) {
    // Add aria labels to category links if missing
    catNav.querySelectorAll('a[href^="#cat-"]').forEach(a => {
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', 'Jump to ' + a.textContent.trim());
    });
  }
})();