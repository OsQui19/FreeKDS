let hierarchy = ["FOH", "BOH", "management"];

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

module.exports = { loadHierarchy, saveHierarchy, getHierarchy, getRoleLevel, hasLevel };
