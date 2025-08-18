const logger = require('../../utils/logger');
const { query } = require('../../utils/db');
let settings = {};

async function loadSettings(db) {
  try {
    const [rows] = await query(
      db,
      'SELECT setting_key, setting_value FROM settings',
    );
    const newSettings = {};
    rows.forEach((r) => {
      newSettings[r.setting_key] = r.setting_value;
    });
    settings = newSettings;
    return settings;
  } catch (err) {
    logger.error('Error loading settings:', err);
    throw err;
  }
}

function getSettings() {
  return settings;
}

module.exports = { loadSettings, getSettings };
