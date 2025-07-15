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

async function loadLatestRelease() {
  const btn = document.getElementById('checkUpdatesBtn');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch('/admin/updates/latest');
    const data = await res.json();
    if (res.ok && data) {
      const v = document.getElementById('releaseVersion');
      if (v && (data.tag_name || data.name)) {
        v.textContent = data.tag_name || data.name;
      }
      const notes = document.getElementById('releaseNotes');
      if (notes && data.body) {
        notes.textContent = data.body;
      }
      const link = document.getElementById('downloadLink');
      if (link && data.html_url) {
        link.href = data.html_url;
        link.classList.remove('d-none');
      }
    }
  } catch (err) {
    console.error('Failed to load release info', err);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function initUpdatesTab() {
  loadGitInfo();
  loadLatestRelease();
  const btn = document.getElementById('checkUpdatesBtn');
  if (btn) btn.addEventListener('click', loadLatestRelease);
  const applyBtn = document.getElementById('applyUpdateBtn');
  const confirmBtn = document.getElementById('confirmApplyUpdateBtn');
  const modalEl = document.getElementById('applyUpdateModal');
  let applyModal = null;
  if (modalEl && window.bootstrap) {
    applyModal = new bootstrap.Modal(modalEl);
  }
  if (applyBtn && applyModal) {
    applyBtn.addEventListener('click', () => applyModal.show());
  }
  if (confirmBtn && applyModal) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      try {
        const res = await fetch('/admin/updates/apply', { method: 'POST' });
        if (!res.ok) alert('Update failed');
        else alert('Update applied');
      } catch (err) {
        console.error(err);
        alert('Update failed');
      } finally {
        confirmBtn.disabled = false;
        applyModal.hide();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUpdatesTab);
} else {
  initUpdatesTab();
}

window.initUpdatesTab = initUpdatesTab;
