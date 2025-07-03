const DEFAULT_HIERARCHY = ["FOH", "BOH", "management"];
const ALL_MODULES = [
  "stations",
  "order",
  "menu",
  "theme",
  "inventory",
  "suppliers",
  "purchase-orders",
  "reports",
  "employees",
  "locations",
];

let hierarchy = [...DEFAULT_HIERARCHY];
let permissions = {};

function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  const norm = role.trim().toLowerCase();
  if (['admin', 'administrator', 'manager'].includes(norm)) return 'management';
  return norm;
}

function normalizeModuleName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

function loadHierarchy(db, cb) {
  return new Promise((resolve, reject) => {
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
        if (err) reject(err);
        else resolve(hierarchy);
      },
    );
  });
}

function saveHierarchy(db, arr, cb) {
  if (Array.isArray(arr) && arr.length) {
    hierarchy = arr.map((r) => (typeof r === 'string' ? r.trim() : r));
  }
  db.query(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('role_hierarchy', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
    [JSON.stringify(hierarchy)],
    cb || (() => {}),
  );
}

function loadPermissions(db, cb) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT setting_value FROM settings WHERE setting_key='role_permissions' LIMIT 1",
      (err, rows) => {
        if (!err && rows.length) {
          try {
            const data = JSON.parse(rows[0].setting_value);
            if (data && typeof data === 'object') {
              const norm = {};
              Object.entries(data).forEach(([roleKey, mods]) => {
                if (!Array.isArray(mods)) return;
                norm[roleKey] = mods
                  .map((m) => normalizeModuleName(m))
                  .filter(Boolean);
              });
              permissions = norm;
            }
          } catch (e) {
            console.error(
              'Error parsing role_permissions from settings table:',
              e.message,
            );
          }
        }
        if (cb) cb(err, permissions);
        if (err) reject(err);
        else resolve(permissions);
      },
    );
  });
}

function savePermissions(db, obj, cb) {
  if (obj && typeof obj === 'object') {
    const norm = {};
    Object.entries(obj).forEach(([roleKey, mods]) => {
      if (!Array.isArray(mods)) return;
      const key = typeof roleKey === 'string' ? roleKey.trim() : roleKey;
      norm[key] = mods.map((m) => normalizeModuleName(m)).filter(Boolean);
    });
    permissions = norm;
  }
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
          const defaults = {
            management: ALL_MODULES,
            BOH: ["stations"],
            FOH: ["order"],
          };
          await db
            .promise()
            .query(
              "INSERT INTO settings (setting_key, setting_value) VALUES ('role_permissions', ?)",
              [JSON.stringify(defaults)],
            );
        }
        resolve();
      },
    );
  });
}

function getHierarchy() {
  if (!hierarchy.length) return ['management'];
  return hierarchy.slice();
}

function getRoleLevel(role) {
  const norm = normalizeRole(role);
  for (let i = 0; i < hierarchy.length; i += 1) {
    if (normalizeRole(hierarchy[i]) === norm) return i;
  }
  return -1;
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
  let topRole = getHierarchy().slice(-1)[0];
  if (!topRole) topRole = 'management';
  const norm = normalizeRole(role);
  const topNorm = normalizeRole(topRole);
  const key = Object.keys(permissions).find(
    (k) => normalizeRole(k) === norm,
  );
  if (norm === topNorm && (!key || !Array.isArray(permissions[key]))) {
    return ALL_MODULES.map((m) => normalizeModuleName(m));
  }
  return key && Array.isArray(permissions[key])
    ? permissions[key].map((m) => normalizeModuleName(m))
    : [];
}

function roleHasAccess(role, component) {
  const comp = normalizeModuleName(component);
  if (!comp) return false;
  const allowed = getRolePermissions(role);
  const topRole = getHierarchy().slice(-1)[0];
  if (hasLevel(role, topRole)) return true;
  return allowed.includes(comp);
}

module.exports = {
  loadHierarchy,
  saveHierarchy,
  loadPermissions,
  savePermissions,
  ensureDefaults,
  normalizeRole,
  normalizeModuleName,
  getHierarchy,
  getRoleLevel,
  hasLevel,
  getPermissions,
  getRolePermissions,
  roleHasAccess,
  ALL_MODULES,
};
