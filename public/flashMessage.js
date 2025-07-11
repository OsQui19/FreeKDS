document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location);
  url.searchParams.delete('msg');
  history.replaceState(null, '', url);
});
