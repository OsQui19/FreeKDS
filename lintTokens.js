#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TOKENS_DIR = path.resolve(__dirname, '..', 'tokens');
const REQUIRED_KEYS = ['value', 'type'];
const ALLOWED_KEYS = ['value', 'type', 'description'];

function isObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val);
}

function walk(obj, trail = [], errors = []) {
  for (const [key, val] of Object.entries(obj)) {
    if (key === '$schema') continue;
    const nextTrail = trail.concat(key);
    if (isObject(val) && !('value' in val)) {
      walk(val, nextTrail, errors);
      continue;
    }
    if (!isObject(val)) {
      errors.push(`${nextTrail.join('.')} should be an object`);
      continue;
    }
    for (const req of REQUIRED_KEYS) {
      if (!(req in val)) {
        errors.push(`${nextTrail.join('.')} missing required key: ${req}`);
      }
    }
    for (const k of Object.keys(val)) {
      if (!ALLOWED_KEYS.includes(k)) {
        errors.push(`${nextTrail.join('.')} has unknown key: ${k}`);
      }
    }
  }
  return errors;
}

function validateFile(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = walk(data);
  if (errors.length) {
    console.error(`Errors in ${path.relative(process.cwd(), file)}:`);
    errors.forEach(e => console.error('  -', e));
    return false;
  }
  return true;
}

function collect(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collect(full));
    else if (entry.isFile() && full.endsWith('.json')) files.push(full);
  }
  return files;
}

function main() {
  const files = collect(TOKENS_DIR);
  let ok = true;
  for (const file of files) {
    if (!validateFile(file)) ok = false;
  }
  if (!ok) {
    console.error('Token lint failed');
    process.exit(1);
  }
  console.log('All tokens valid');
}

main();
