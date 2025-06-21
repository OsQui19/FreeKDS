// JS for inventory management

document.addEventListener('DOMContentLoaded', () => {
  function serialize(form) {
    return new URLSearchParams(new FormData(form));
  }
  function handleForm(form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      fetch(form.action, {
        method: form.method || 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: serialize(form),
        redirect: 'manual'
      }).then(() => {
        history.replaceState(null, '', window.location.pathname);
        location.reload();
      });
    });
  }
  document.querySelectorAll('.ingredient-list form, #transaction-form').forEach(handleForm);
});
