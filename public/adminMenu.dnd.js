
// public/adminMenu.dnd.js
(function(){
  if (typeof Sortable === 'undefined') return;

  const catContainer = document.getElementById('categories-container');
  if (catContainer) {
    new Sortable(catContainer, {
      handle: '.category-header .drag-handle',
      draggable: '.category-section',
      animation: 150,
      onEnd() {
        const order = Array.from(catContainer.querySelectorAll('.category-section'))
          .map(el => el.getAttribute('data-category-id'));
        fetch('/admin/categories/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order })
        }).then(() => {
          const frame = document.getElementById('menuPreview');
          if (frame) frame.contentWindow.location.reload();
        });
      }
    });
  }

  document.querySelectorAll('.item-list').forEach(listEl => {
    new Sortable(listEl, {
      handle: '.item-view .drag-handle',
      draggable: '.menu-item',
      animation: 150,
      onEnd() {
        const categoryId = listEl.getAttribute('data-category-id');
        const order = Array.from(listEl.querySelectorAll('.menu-item'))
          .map(el => el.getAttribute('data-item-id'));
        fetch('/admin/items/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId, order })
        }).then(() => {
          const frame = document.getElementById('menuPreview');
          if (frame) frame.contentWindow.location.reload();
        });
      }
    });
  });
})();
