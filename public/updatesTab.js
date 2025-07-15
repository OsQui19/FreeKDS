async function loadGitInfo() {
  try {
    const res = await fetch('/admin/updates/info');
    const data = await res.json();
    if (data.commit) {
      const el = document.getElementById('gitCommit');
      if (el) el.textContent = data.commit;
    }
    if (data.date) {
      const el = document.getElementById('gitDate');
      if (el) el.textContent = data.date;
    }
    if (Array.isArray(data.log)) {
      const list = document.getElementById('gitLog');
      if (list) {
        list.innerHTML = data.log
          .map((l) => `<li class="list-group-item">${l}</li>`)
          .join('');
      }
    }
  } catch (err) {
    console.error('Failed to load git info', err);
  }
}

function initUpdatesTab() {
  loadGitInfo();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUpdatesTab);
} else {
  initUpdatesTab();
}

window.initUpdatesTab = initUpdatesTab;
