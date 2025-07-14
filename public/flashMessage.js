document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location);
  url.searchParams.delete('msg');
  url.searchParams.delete('err');
  url.searchParams.delete('detail');
  history.replaceState(null, '', url);
});
