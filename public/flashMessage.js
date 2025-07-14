document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location);
  url.searchParams.delete('msg');
  url.searchParams.delete('err');
  history.replaceState(null, '', url);
});
