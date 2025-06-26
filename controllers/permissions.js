const { getHierarchy, hasLevel } = require("./hierarchy");

let permissions = {};

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
  loadPermissions,
  savePermissions,
  getPermissions,
  getRolePermissions,
  roleHasAccess,
};
