document.addEventListener('DOMContentLoaded', () => {
  const toastEl = document.getElementById('flashToast');
  if (toastEl && window.bootstrap && bootstrap.Toast) {
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }
  const url = new URL(window.location);
  url.searchParams.delete('msg');
  url.searchParams.delete('err');
  url.searchParams.delete('detail');
  history.replaceState(null, '', url);
});
