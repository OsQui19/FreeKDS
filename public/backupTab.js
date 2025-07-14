import { showAlert } from '/adminUtils.js';

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
}

async function loadBackups() {
  try {
    const res = await fetch('/admin/backups/list');
    const data = await res.json();
    if (Array.isArray(data.backups)) {
      renderRows(data.backups);
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackupTab);
} else {
  initBackupTab();
}
