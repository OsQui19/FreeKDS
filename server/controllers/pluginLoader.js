const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const validators = require('../../schemas/validate');

let manifests = [];

function loadPluginManifests() {
  const pluginsDir = path.resolve(__dirname, '..', '..', 'src', 'plugins');
  const validate = validators.pluginManifest;
  manifests = [];
  if (!fs.existsSync(pluginsDir) || !validate) return;
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (!entry.isDirectory()) return;
    const manifestPath = path.join(pluginsDir, entry.name, 'plugin.json');
    if (!fs.existsSync(manifestPath)) return;
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (validate(data)) {
        manifests.push(data);
      } else {
        logger.error(`Invalid plugin manifest ${manifestPath}`, validate.errors);
      }
    } catch (err) {
      logger.error(`Failed to load plugin manifest ${manifestPath}`, err);
    }
  });
}

function getManifests() {
  return manifests;
}

module.exports = { loadPluginManifests, getManifests };
