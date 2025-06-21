// JS for AJAX-based menu management forms

function initAdminMenu() {
  function serialize(form) {
    return new URLSearchParams(new FormData(form));
  }

  function showAlert(msg) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show m-2';
    alert.role = 'alert';
    alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    const screen = document.querySelector('.admin-screen');
    (screen || document.body).prepend(alert);
  }

  function handleForm(form, onSuccess) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const scroll = window.scrollY;
      const data = serialize(form);
      fetch(form.action, {
        method: form.method || 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data,
        redirect: 'manual'
      })
        .then(res => {
          let msg = null;
          if (res.headers.get('Location')) {
            const loc = new URL(res.headers.get('Location'), window.location.origin);
            msg = loc.searchParams.get('msg');
          } else if (res.url) {
            try { msg = new URL(res.url).searchParams.get('msg'); } catch {}
          }
          if (typeof onSuccess === 'function') onSuccess();
          if (msg) {
            showAlert(decodeURIComponent(msg.replace(/\+/g, ' ')));
            history.replaceState(null, '', window.location.pathname);
          }
          window.scrollTo(0, scroll);
        })
        .catch(err => {
          console.error('Form submit failed', err);
          showAlert('Error saving');
        });
    });
  }

  document.querySelectorAll('.item-edit-form form').forEach(form => {
    handleForm(form, () => {
      const li = form.closest('li.menu-item');
      if (!li) return;
      li.querySelector('.item-name').textContent = form.elements.name.value;
      li.querySelector('.item-price').textContent = '$' + parseFloat(form.elements.price.value).toFixed(2);
      const stSel = form.elements.station_id;
      if (stSel) {
        li.querySelector('.item-station').textContent = stSel.options[stSel.selectedIndex].textContent;
      }
      const modNames = Array.from(form.querySelectorAll('input[name="modifier_ids"]:checked')).map(cb => cb.parentNode.textContent.trim());
      li.querySelector('.item-mods').textContent = modNames.length ? 'Extras: ' + modNames.join(', ') : 'Extras: None';
      li.querySelector('.item-edit-form').classList.add('hidden');
      li.querySelector('.item-view').classList.remove('hidden');
    });
  });

  document.querySelectorAll('.category-edit-form form').forEach(form => {
    handleForm(form, () => {
      const id = form.elements.id.value;
      const section = document.querySelector(`.category-section[data-category-id="${id}"]`);
      if (section) {
        section.querySelector('.category-name-view').textContent = form.elements.name.value;
        section.querySelector('.category-edit-form').classList.add('hidden');
        section.querySelector('.category-header').classList.remove('hidden');
      }
    });
  });

  document.querySelectorAll('.mod-row form[action="/admin/modifiers"]').forEach(form => {
    handleForm(form, () => {
      showAlert('Modifier saved');
    });
  });

  function initModifierFields() {
    const ings = window.publicIngredients || [];
    const findByName = name => ings.find(i => i.name.toLowerCase() === name.toLowerCase());
    document.querySelectorAll('.mod-row form[action="/admin/modifiers"]').forEach(form => {
      const input = form.querySelector('.mod-name');
      const hidden = form.querySelector('input[name="ingredient_id"]');
      if (!input || !hidden) return;
      const setVal = () => {
        const ing = findByName(input.value.trim());
        if (ing) {
          hidden.value = ing.id;
          input.value = ing.name;
        } else {
          hidden.value = '';
        }
      };
      input.addEventListener('change', setVal);
      form.addEventListener('submit', e => {
        setVal();
        if (!hidden.value) {
          e.preventDefault();
          alert('Please select a valid ingredient for the modifier');
        }
      });
      // initialise existing value
      setVal();
    });
  }
function initIngredientFields() {
    const ings = window.publicIngredients || [];
    if (!document.getElementById('ingredientsList')) {
      const dl = document.createElement('datalist');
      dl.id = 'ingredientsList';
      dl.innerHTML = ings.map(i => `<option value="${i.name}"></option>`).join('');
      document.body.appendChild(dl);
    }
    const findByName = name => ings.find(i => i.name.toLowerCase() === name.toLowerCase());
    document.querySelectorAll('.ingredient-container').forEach(container => {
      const rowsDiv = container.querySelector('.ingredient-rows');
      const addRow = () => {
        const div = document.createElement('div');
        div.className = 'ingredient-row d-flex gap-2 mb-1 align-items-center';
        div.innerHTML =
          `<input class="form-control ingredient-name" list="ingredientsList" placeholder="Ingredient">`+
          `<input type="hidden" name="ingredient_ids">`+
          `<input type="hidden" name="ingredient_unit_ids">`+
          `<input class="form-control" type="number" step="0.01" name="ingredient_amounts" value="0">`+
          `<span class="ingredient-unit"></span>`+
          `<button type="button" class="btn btn-secondary remove-ingredient-row">x</button>`;
        rowsDiv.appendChild(div);
      };
      container.querySelectorAll('.add-ingredient-row').forEach(btn => btn.addEventListener('click', addRow));
      rowsDiv.addEventListener('click', e => {
        if (e.target.classList.contains('remove-ingredient-row')) {
          e.target.parentElement.remove();
        }
      });
      rowsDiv.addEventListener('change', e => {
        if (e.target.classList.contains('ingredient-name')) {
          const row = e.target.closest('.ingredient-row');
          const hidden = row.querySelector('input[name="ingredient_ids"]');
          const unit = row.querySelector('.ingredient-unit');
          const unitHidden = row.querySelector('input[name="ingredient_unit_ids"]');
          const ing = findByName(e.target.value.trim());
          if (ing) {
            hidden.value = ing.id;
            if (unitHidden) unitHidden.value = ing.unit_id || '';
            unit.textContent = ing.unit || '';
          } else {
            e.target.value = '';
            hidden.value = '';
            if (unitHidden) unitHidden.value = '';
            unit.textContent = '';
          }
        }
      });
    });
  }

  function initRecipeFields() {
    document.querySelectorAll('.recipe-container').forEach(container => {
      const rowsDiv = container.querySelector('.recipe-rows');
      const input = container.querySelector('.recipe-input');
      const addBtn = container.querySelector('.add-recipe-row');
      const hidden = container.querySelector('input[name="recipe"]');
      const addRow = (text = '') => {
        const div = document.createElement('div');
        div.className = 'recipe-row d-flex gap-2 mb-1';
        div.innerHTML = `<input class="form-control" type="text" name="recipe_steps" value="${text}">`+
          `<button type="button" class="btn btn-secondary remove-recipe-row">x</button>`;
        rowsDiv.appendChild(div);
      };
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          if (!input.value.trim()) return;
          addRow(input.value.trim());
          input.value = '';
        });
      }
      rowsDiv.addEventListener('click', e => {
        if (e.target.classList.contains('remove-recipe-row')) {
          e.target.parentElement.remove();
        }
      });
      const form = container.closest('form');
      if (form) {
        form.addEventListener('submit', () => {
          if (input.value.trim()) {
            addRow(input.value.trim());
            input.value = '';
          }
          const steps = Array.from(rowsDiv.querySelectorAll('input[name="recipe_steps"]')).map(i => i.value.trim()).filter(Boolean);
          if (hidden) hidden.value = steps.join('\n');
        });
      }
    });
  }

  initIngredientFields();
  initRecipeFields();
  initModifierFields();
  const modal = document.getElementById('addRecipeModal');
  if (modal) {
    const saveBtn = document.getElementById('recipeSave');
    const cancelBtn = document.getElementById('recipeCancel');
    let currentForm = null;

    const closeModal = () => {
      modal.classList.add('d-none');
      modal.classList.remove('d-flex');
    };

    document.querySelectorAll('.open-recipe-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        currentForm = btn.closest('form');
        modal.querySelector('.recipe-rows').innerHTML = '';
        modal.querySelector('.ingredient-rows').innerHTML = '';
        const input = modal.querySelector('.recipe-input');
        if (input) input.value = '';
        modal.classList.remove('d-none');
        modal.classList.add('d-flex');
      });
    });

    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', () => {
      if (!currentForm) return;
      const steps = Array.from(modal.querySelectorAll('.recipe-row input[name="recipe_steps"]'))
        .map(i => i.value.trim()).filter(Boolean);
      const recipeHidden = currentForm.querySelector('input[name="recipe"]');
      if (recipeHidden) recipeHidden.value = steps.join('\n');

      const hiddenBox = currentForm.querySelector('.hidden-ingredients');
      if (hiddenBox) hiddenBox.innerHTML = '';
      modal.querySelectorAll('.ingredient-row').forEach(row => {
        const idField = row.querySelector('input[name="ingredient_ids"]');
        const id = idField ? idField.value : '';
        const amt = row.querySelector('input[name="ingredient_amounts"]').value;
        const unitField = row.querySelector('input[name="ingredient_unit_ids"]');
        const unitId = unitField ? unitField.value : '';
        if (!id) return;
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.name = 'ingredient_ids';
        idInput.value = id;
        const amtInput = document.createElement('input');
        amtInput.type = 'hidden';
        amtInput.name = 'ingredient_amounts';
        amtInput.value = amt;
        const unitInput = document.createElement('input');
        unitInput.type = 'hidden';
        unitInput.name = 'ingredient_unit_ids';
        unitInput.value = unitId;
        hiddenBox.appendChild(idInput);
        hiddenBox.appendChild(unitInput);
        hiddenBox.appendChild(amtInput);
      });

      closeModal();
      currentForm.submit();
    });
  }
}
window.initAdminMenu = initAdminMenu;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminMenu);
} else {
  initAdminMenu();
}
