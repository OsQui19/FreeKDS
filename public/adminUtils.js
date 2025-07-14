export function showAlert(msg, type = 'success', container = document.body) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show m-2`;
  alert.role = 'alert';
  alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  (container || document.body).prepend(alert);
}

function serialize(form) {
  return new URLSearchParams(new FormData(form));
}

export function handleForm(form, onSuccess, opts = {}) {
  const {
    followRedirect = false,
    reloadOnSuccess = false,
    alertContainer = document.body,
    errorType = 'success',
  } = opts;

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
      redirect: followRedirect ? 'follow' : 'manual',
    })
      .then(async (res) => {
        if (followRedirect) {
          if (!res.ok) {
            const msg = await res.text().catch(() => 'Error saving');
            showAlert(msg || 'Error saving', errorType, alertContainer);
            return;
          }
          if (res.redirected) {
            window.location.href = res.url;
            return;
          }
          if (typeof onSuccess === 'function') await onSuccess(res);
          if (reloadOnSuccess) location.reload();
        } else {
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
            showAlert(decodeURIComponent(msg.replace(/\+/g, ' ')), 'success', alertContainer);
            history.replaceState(null, '', window.location.pathname);
          }
        }
        window.scrollTo(0, scroll);
      })
      .catch((err) => {
        console.error('Form submit failed', err);
        showAlert('Error saving', errorType, alertContainer);
      })
      .finally(() => {
        if (typeof hide === 'function') hide();
      });
  });
}
