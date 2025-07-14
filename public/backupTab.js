import { showAlert } from '/adminUtils.js';

let backupsCache = [];

function fmtSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function renderRows(backups) {
  const tbody = document.querySelector('#backupTable tbody');
  if (!tbody) return;
  tbody.innerHTML = backups
    .map(
      (b) => `\
<tr>\
  <td>${b.name}</td>\
  <td>${new Date(b.mtime).toLocaleString()}</td>\
  <td>${fmtSize(b.size)}</td>\
  <td><button class="btn btn-sm btn-outline-primary restore-backup" data-file="${b.name}">Restore</button></td>\
</tr>`
    )
    .join('');
  tbody.querySelectorAll('.restore-backup').forEach((btn) => {
    btn.addEventListener('click', () => restoreBackup(btn.dataset.file));
  });

  const select = document.getElementById('restoreFileSelect');
  if (select) {
    select.innerHTML = backups
      .map((b) => `<option value="${b.name}">${b.name}</option>`)
      .join('');
  }
}

async function loadBackups() {
  try {
    const res = await fetch('/admin/backups/list');
    const data = await res.json();
    if (Array.isArray(data.backups)) {
      backupsCache = data.backups;
      renderRows(backupsCache);
    }
  } catch (err) {
    console.error(err);
    showAlert('Failed to load backups', 'danger', document.getElementById('backupAlertContainer'));
  }
}

async function restoreBackup(file) {
  if (!confirm('Restore this backup? This will overwrite current data.')) return;
  const hide = window.showSpinner ? window.showSpinner() : () => {};
  try {
    const res = await fetch('/admin/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file }),
    });
    if (res.ok) {
      showAlert('Restore complete', 'success', document.getElementById('backupAlertContainer'));
    } else {
      showAlert('Restore failed', 'danger', document.getElementById('backupAlertContainer'));
    }
  } catch (err) {
    console.error(err);
    showAlert('Restore failed', 'danger', document.getElementById('backupAlertContainer'));
  } finally {
    if (typeof hide === 'function') hide();
  }
}

function initBackupTab() {
  loadBackups();
  const restoreBtn = document.getElementById('restoreSelectedBtn');
  const createBtn = document.getElementById('createBackupBtn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      const select = document.getElementById('restoreFileSelect');
      if (select && select.value) restoreBackup(select.value);
    });
  }
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const hide = window.showSpinner ? window.showSpinner() : () => {};
      try {
        const res = await fetch('/admin/backups/create', { method: 'POST' });
        if (res.ok) {
          showAlert('Backup created', 'success', document.getElementById('backupAlertContainer'));
          loadBackups();
        } else {
          showAlert('Backup failed', 'danger', document.getElementById('backupAlertContainer'));
        }
      } catch (err) {
        console.error(err);
        showAlert('Backup failed', 'danger', document.getElementById('backupAlertContainer'));
      } finally {
        if (typeof hide === 'function') hide();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackupTab);
} else {
  initBackupTab();
}
