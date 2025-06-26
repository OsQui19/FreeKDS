const DEFAULT_HIERARCHY = ["FOH", "BOH", "management"];
let hierarchy = [...DEFAULT_HIERARCHY];
let permissions = {};

function loadHierarchy(db, cb) {
  db.query(
    "SELECT setting_value FROM settings WHERE setting_key='role_hierarchy' LIMIT 1",
    (err, rows) => {
      if (!err && rows.length) {
        try {
          const data = JSON.parse(rows[0].setting_value);
          if (Array.isArray(data) && data.length) hierarchy = data;
        } catch {
          /* ignore */
        }
      }
      if (cb) cb(err, hierarchy);
    },
  );
}

function saveHierarchy(db, arr, cb) {
  hierarchy = Array.isArray(arr) && arr.length ? arr : hierarchy;
  db.query(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('role_hierarchy', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
    [JSON.stringify(hierarchy)],
    cb || (() => {}),
  );
}

function loadPermissions(db, cb) {
  db.query(
    "SELECT setting_value FROM settings WHERE setting_key='role_permissions' LIMIT 1",
    (err, rows) => {
      if (!err && rows.length) {
        try {
          const data = JSON.parse(rows[0].setting_value);
          if (data && typeof data === 'object') permissions = data;
        } catch {
          /* ignore */
        }
      }
      if (cb) cb(err, permissions);
    },
  );
}

function savePermissions(db, obj, cb) {
  permissions = obj && typeof obj === 'object' ? obj : permissions;
  db.query(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('role_permissions', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
    [JSON.stringify(permissions)],
    cb || (() => {}),
  );
}

function ensureDefaults(db) {
  return new Promise((resolve) => {
    db.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('role_hierarchy','role_permissions')",
      async (err, rows) => {
        if (err) return resolve();
        const map = {};
        rows.forEach((r) => {
          map[r.setting_key] = r.setting_value;
        });
        if (!map.role_hierarchy) {
          await db
            .promise()
            .query(
              "INSERT INTO settings (setting_key, setting_value) VALUES ('role_hierarchy', ?)",
              [JSON.stringify(DEFAULT_HIERARCHY)],
            );
        } else {
          try {
            const arr = JSON.parse(map.role_hierarchy);
            if (Array.isArray(arr) && !arr.includes('management')) {
              arr.push('management');
              await db
                .promise()
                .query(
                  "UPDATE settings SET setting_value=? WHERE setting_key='role_hierarchy'",
                  [JSON.stringify(arr)],
                );
            }
          } catch {
            /* ignore */
          }
        }
        if (!map.role_permissions) {
          await db
            .promise()
            .query(
              "INSERT INTO settings (setting_key, setting_value) VALUES ('role_permissions', '{}')",
            );
        }
        resolve();
      },
    );
  });
}

function getHierarchy() {
  return hierarchy.slice();
}

function getRoleLevel(role) {
  return hierarchy.indexOf(role);
}

function hasLevel(role, minRole) {
  const r = getRoleLevel(role);
  const m = getRoleLevel(minRole);
  return r >= 0 && m >= 0 && r >= m;
}

function getPermissions() {
  return { ...permissions };
}

function getRolePermissions(role) {
  return Array.isArray(permissions[role]) ? permissions[role] : [];
}

function roleHasAccess(role, component) {
  if (!component) return false;
  const allowed = getRolePermissions(role);
  const topRole = getHierarchy().slice(-1)[0];
  if (hasLevel(role, topRole)) return true;
  return allowed.includes(component);
}

module.exports = {
  loadHierarchy,
  saveHierarchy,
  loadPermissions,
  savePermissions,
  ensureDefaults,
  getHierarchy,
  getRoleLevel,
  hasLevel,
  getPermissions,
  getRolePermissions,
  roleHasAccess,
};
