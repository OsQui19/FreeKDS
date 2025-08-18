const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const logger = require('../../utils/logger');

let manifests = [];

function loadPluginManifests() {
  const schemaPath = path.resolve(__dirname, '..', '..', 'plugin-manifest.schema.json');
  const pluginsDir = path.resolve(__dirname, '..', '..', 'src', 'plugins');
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } catch (err) {
    logger.error('Failed to read plugin manifest schema', err);
    return;
  }
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  manifests = [];
  if (!fs.existsSync(pluginsDir)) return;
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
