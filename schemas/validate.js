const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const schemaDir = __dirname;
const indexPath = path.join(schemaDir, 'schema-index.json');
let index = {};
try {
  index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Failed to read schema index', err);
}

const ajv = new Ajv({ allErrors: true });
const validators = {};

function toKey(url) {
  const match = /\/([^\/]+?)\.schema/.exec(url);
  if (!match) return url;
  return match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

Object.entries(index).forEach(([url, file]) => {
  try {
    const schemaPath = path.join(schemaDir, file);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    delete schema.$schema; // Ajv v6 compatibility
    const key = toKey(url);
    validators[key] = ajv.compile(schema);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to compile schema', file, err);
  }
});

module.exports = validators;
