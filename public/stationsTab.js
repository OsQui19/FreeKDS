let stationsTabInitialized = false;

function serialize(form) {
  return new URLSearchParams(new FormData(form));
}

function showAlert(msg) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-success alert-dismissible fade show m-2';
  alert.role = 'alert';
  alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  const container = document.querySelector('.admin-container') || document.body;
  container.prepend(alert);
}

function handleForm(form, onSuccess) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const scroll = window.scrollY;
    const hide = window.showSpinner ? window.showSpinner() : () => {};
    fetch(form.action, {
      method: form.method || 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: serialize(form),
      redirect: 'manual',
    })
      .then(async (res) => {
        let msg = null;
        if (res.headers.get('Location')) {
          const loc = new URL(res.headers.get('Location'), window.location.origin);
          msg = loc.searchParams.get('msg');
        } else if (res.url) {
          try {
            msg = new URL(res.url).searchParams.get('msg');
          } catch {}
        }
        if (typeof onSuccess === 'function') await onSuccess(res);
        if (msg) {
          showAlert(decodeURIComponent(msg.replace(/\+/g, ' ')));
          history.replaceState(null, '', window.location.pathname);
        }
        window.scrollTo(0, scroll);
      })
      .catch((err) => {
        console.error('Form submit failed', err);
        showAlert('Error saving');
      })
      .finally(() => {
        if (typeof hide === 'function') hide();
      });
  });
}

function attachConfirm(form) {
  if (!form) return;
  const msg = form.getAttribute('data-confirm');
  if (!msg) return;
  form.addEventListener('submit', (e) => {
    if (!window.confirm(msg)) e.preventDefault();
  });
}

function attachCollapse(sectionId) {
  const sec = document.getElementById(sectionId);
  if (!sec) return;
  const btn = document.querySelector(`button[data-bs-target="#${sectionId}"]`);
  if (!btn) return;
  const updateText = () => {
    btn.textContent = sec.classList.contains('show') ? 'Hide Settings' : 'Show Settings';
  };
  updateText();
  sec.addEventListener('shown.bs.collapse', updateText);
  sec.addEventListener('hidden.bs.collapse', updateText);
}

function createStationCard(st) {
  const div = document.createElement('div');
  div.className = 'card mb-3 shadow-sm';
  div.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>${st.name}</span>
        <button class="btn btn-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#station-${st.id}">Show Settings</button>
      </div>
      <div id="station-${st.id}" class="collapse">
        <div class="card-body">
          <form method="POST" action="/admin/stations/update" class="mb-2">
            <input type="hidden" name="id" value="${st.id}">
            <div class="row mb-3">
              <label for="station-name-${st.id}" class="col-sm-4 col-form-label">Name</label>
              <div class="col-sm-8">
                <input id="station-name-${st.id}" class="form-control" type="text" name="name" value="${st.name}" required>
              </div>
            </div>
            <div class="row mb-3">
              <label for="station-type-${st.id}" class="col-sm-4 col-form-label">Type</label>
              <div class="col-sm-8">
                <select id="station-type-${st.id}" class="form-select" name="type">
                  <option value="prep"${st.type === 'prep' ? ' selected' : ''}>prep</option>
                  <option value="expo"${st.type === 'expo' ? ' selected' : ''}>expo</option>
                </select>
              </div>
            </div>
            <div class="row mb-3">
              <label for="station-filter-${st.id}" class="col-sm-4 col-form-label">Order Filter</label>
              <div class="col-sm-8">
                <select id="station-filter-${st.id}" class="form-select" name="order_type_filter">
                  <option value=""${!st.order_type_filter ? ' selected' : ''}>(none)</option>
                  <option value="DINE-IN"${st.order_type_filter === 'DINE-IN' ? ' selected' : ''}>DINE-IN only</option>
                  <option value="TO-GO"${st.order_type_filter === 'TO-GO' ? ' selected' : ''}>TO-GO only</option>
                  <option value="CATERING"${st.order_type_filter === 'CATERING' ? ' selected' : ''}>CATERING only</option>
                </select>
              </div>
            </div>
            <div class="row mb-3">
              <label for="station-bg-${st.id}" class="col-sm-4 col-form-label">Bg Color</label>
              <div class="col-sm-8">
                <input id="station-bg-${st.id}" class="form-control" type="color" name="bg_color" value="${st.bg_color || '#222222'}">
              </div>
            </div>
            <div class="row mb-3">
              <label for="station-primary-${st.id}" class="col-sm-4 col-form-label">Primary</label>
              <div class="col-sm-8">
                <input id="station-primary-${st.id}" class="form-control" type="color" name="primary_color" value="${st.primary_color || '#0084ff'}">
              </div>
            </div>
            <div class="row mb-3">
              <label for="station-font-${st.id}" class="col-sm-4 col-form-label">Font</label>
              <div class="col-sm-8">
                <input id="station-font-${st.id}" class="form-control" type="text" name="font_family" value="${st.font_family || ''}">
              </div>
            </div>
            <div class="d-flex justify-content-end gap-2 mt-3">
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
          <form method="POST" action="/admin/stations/delete" class="text-end" data-confirm="Delete station ${st.name}?">
            <input type="hidden" name="id" value="${st.id}">
            <button type="submit" class="btn btn-secondary">Delete</button>
          </form>
        </div>
      </div>`;
  return div;
}

function initStationsTab() {
  if (stationsTabInitialized) return;
  stationsTabInitialized = true;

  document.querySelectorAll('[id^="station-"]').forEach((sec) => {
    const btn = document.querySelector(`button[data-bs-target="#${sec.id}"]`);
    if (!btn) return;
    const updateText = () => {
      btn.textContent = sec.classList.contains('show') ? 'Hide Settings' : 'Show Settings';
    };
    updateText();
    sec.addEventListener('shown.bs.collapse', updateText);
    sec.addEventListener('hidden.bs.collapse', updateText);
  });

  const formSection = document.getElementById('newStationForm');
  const formToggle = document.querySelector('button[data-bs-target="#newStationForm"]');
  if (formSection && formToggle) {
    const updateFormText = () => {
      formToggle.textContent = formSection.classList.contains('show') ? 'Hide Form' : 'Show Form';
    };
    updateFormText();
    formSection.addEventListener('shown.bs.collapse', updateFormText);
    formSection.addEventListener('hidden.bs.collapse', updateFormText);
  }

  document.querySelectorAll('form[action="/admin/stations/update"]').forEach((f) => {
    handleForm(f, () => {
      const card = f.closest('.card');
      const nameInput = f.querySelector('input[name="name"]');
      if (card && nameInput) {
        const span = card.querySelector('.card-header span');
        if (span) span.textContent = nameInput.value;
      }
    });
  });

  const addForm = document.querySelector('#newStationForm form');
  if (addForm) {
    handleForm(addForm, async (res) => {
      let data = null;
      if (
        res &&
        res.headers.get('content-type') &&
        res.headers.get('content-type').includes('application/json')
      ) {
        try {
          data = await res.json();
        } catch {}
      }
      if (!data || !data.station) {
        window.location.reload();
        return;
      }
      const card = createStationCard(data.station);
      const container = document.querySelector('.admin-container > .mb-3');
      if (container) {
        container.appendChild(card);
        attachCollapse(`station-${data.station.id}`);
        attachConfirm(card.querySelector('form[action="/admin/stations/delete"]'));
        const updateForm = card.querySelector('form[action="/admin/stations/update"]');
        if (updateForm) handleForm(updateForm, () => {
          const span = card.querySelector('.card-header span');
          const nameInput = updateForm.querySelector('input[name="name"]');
          if (span && nameInput) span.textContent = nameInput.value;
        });
      } else {
        window.location.reload();
      }
      addForm.reset();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStationsTab);
} else {
  initStationsTab();
}

document.addEventListener('adminTabShown', (e) => {
  if (e.detail === 'stations') initStationsTab();
});
