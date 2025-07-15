import { showAlert, handleForm } from '/adminUtils.js';
let currentDir = '/';
let dirModal, dirList, dirPathEl, dirSelectBtn;

let backupsCache = [];

function renderLog(rows) {
  const tbody = document.querySelector('#backupLogTable tbody');
  if (!tbody) return;
  tbody.innerHTML = rows
    .map(
      (r) => `\
<tr>\
  <td>${new Date(r.created_at).toLocaleString()}</td>\
  <td>${r.action}</td>\
  <td>${r.result}</td>\
  <td>${r.message || ''}</td>\
</tr>`,
    )
    .join('');
}

async function loadBackupLog() {
  try {
    const res = await fetch('/admin/backups/log');
    const data = await res.json();
    if (Array.isArray(data.log)) {
      renderLog(data.log);
    }
  } catch (err) {
    console.error('Failed to load backup log', err);
  }
}

async function loadDirectory(dir) {
  try {
    const res = await fetch(`/admin/backups/browse?dir=${encodeURIComponent(dir)}`);
    const data = await res.json();
    if (Array.isArray(data.dirs)) {
      currentDir = data.dir || dir;
      if (dirPathEl) dirPathEl.textContent = currentDir;
      if (dirList) {
        dirList.innerHTML = '';
        if (data.parent) {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.innerHTML = '<button type="button" class="btn btn-sm w-100 text-start dir-link" data-dir="' + data.parent + '">..</button>';
          dirList.appendChild(li);
        }
        data.dirs.forEach((d) => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.innerHTML = '<button type="button" class="btn btn-sm w-100 text-start dir-link" data-dir="' + currentDir + '/' + d + '">' + d + '</button>';
          dirList.appendChild(li);
        });
        dirList.querySelectorAll('.dir-link').forEach((btn) => {
          btn.addEventListener('click', () => loadDirectory(btn.dataset.dir));
        });
      }
    }
  } catch (err) {
    console.error('Browse failed', err);
  }
}

function showDirectoryBrowser(start) {
  if (!dirModal) {
    const modalEl = document.getElementById('dirBrowserModal');
    if (!modalEl) return;
    dirModal = new bootstrap.Modal(modalEl);
    dirList = modalEl.querySelector('#dirBrowserList');
    dirPathEl = modalEl.querySelector('#dirBrowserPath');
    dirSelectBtn = modalEl.querySelector('#dirBrowserSelect');
    if (dirSelectBtn) {
      dirSelectBtn.addEventListener('click', () => {
        const input = document.getElementById('backupDirInput');
        if (input) input.value = currentDir;
        dirModal.hide();
      });
    }
  }
  loadDirectory(start || '/');
  dirModal.show();
}

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
  <td>\
    <button class="btn btn-sm btn-outline-secondary download-backup" data-file="${b.name}"><i class="bi bi-download me-1"></i>Download</button>\
    <button class="btn btn-sm btn-outline-primary ms-1 restore-backup" data-file="${b.name}"><i class="bi bi-arrow-counterclockwise me-1"></i>Restore</button>\
  </td>\
</tr>`
    )
    .join('');
  tbody.querySelectorAll('.restore-backup').forEach((btn) => {
    btn.addEventListener('click', () => restoreBackup(btn.dataset.file));
  });
  tbody.querySelectorAll('.download-backup').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.href = `/admin/backups/download?file=${encodeURIComponent(btn.dataset.file)}`;
    });
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
  loadBackupLog();
  const restoreBtn = document.getElementById('restoreSelectedBtn');
  const createBtn = document.getElementById('createBackupBtn');
  const uploadBtn = document.getElementById('restoreUploadedBtn');
  const uploadInput = document.getElementById('restoreFileInput');
  const dirForm = document.getElementById('backupDirForm');
  const browseBtn = document.getElementById('browseDirBtn');
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
        let msg = null;
        if (res.headers.get('Location')) {
          const loc = new URL(res.headers.get('Location'), window.location.origin);
          msg = loc.searchParams.get('msg');
        } else if (res.url) {
          try {
            msg = new URL(res.url).searchParams.get('msg');
          } catch {}
        }
        if (res.ok) {
          const text = msg ? decodeURIComponent(msg.replace(/\+/g, ' ')) : 'Backup created';
          showAlert(text, 'success', document.getElementById('backupAlertContainer'));
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
  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener('click', async () => {
      if (!uploadInput.files || !uploadInput.files[0]) return;
      if (!confirm('Restore this backup? This will overwrite current data.')) return;
      const formData = new FormData();
      formData.append('backup', uploadInput.files[0]);
      const hide = window.showSpinner ? window.showSpinner() : () => {};
      try {
        const res = await fetch('/admin/backups/upload', { method: 'POST', body: formData });
        const text = await res.text();
        if (res.ok) {
          showAlert('Restore complete', 'success', document.getElementById('backupAlertContainer'));
        } else if (res.status === 400 && text.trim() === 'Invalid backup file') {
          showAlert('Invalid backup file', 'danger', document.getElementById('backupAlertContainer'));
        } else {
          showAlert('Restore failed', 'danger', document.getElementById('backupAlertContainer'));
        }
      } catch (err) {
        console.error(err);
        showAlert('Restore failed', 'danger', document.getElementById('backupAlertContainer'));
      } finally {
        if (typeof hide === 'function') hide();
        uploadInput.value = '';
      }
    });
  }
  if (dirForm) {
    handleForm(dirForm, () => loadBackups(), {
      alertContainer: document.getElementById('backupAlertContainer'),
      followRedirect: true,
    });
  }
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      const input = document.getElementById('backupDirInput');
      showDirectoryBrowser(input ? input.value : '/');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackupTab);
} else {
  initBackupTab();
}
