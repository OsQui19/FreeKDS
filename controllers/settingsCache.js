let settings = {};

function loadSettings(db, cb) {
  db.query("SELECT setting_key, setting_value FROM settings", (err, rows) => {
    if (err) {
      console.error("Error loading settings:", err);
      if (cb) return cb(err);
      return;
    }
    const newSettings = {};
    rows.forEach((r) => {
      newSettings[r.setting_key] = r.setting_value;
    });
    settings = newSettings;
    if (cb) cb(null, settings);
  });
}

function getSettings() {
  return settings;
}

module.exports = { loadSettings, getSettings };
