const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const tokensDir = path.join(__dirname, '..', '..', '..', 'tokens');
const baseTokens = require(path.join(tokensDir, 'base.json'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const src = source[key];
    if (src && typeof src === 'object' && !Array.isArray(src)) {
      if ('$value' in src) {
        target[key] = { ...(target[key] || {}), ...src };
      } else {
        target[key] = deepMerge(target[key] || {}, src);
      }
    } else {
      target[key] = src;
    }
  }
  return target;
}

function normalizeValues(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        normalizeValues(val);
        if ('value' in val && !('$value' in val)) {
          val.$value = val.value;
          delete val.value;
        }
      }
    }
  }
  return obj;
}

async function loadJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Could not read token file at ${filePath}`, err);
    return JSON.parse(JSON.stringify(baseTokens));
  }
}

router.get('/tokens', async (req, res, next) => {
  try {
    const { stationId, screenId } = req.query;
    let tokens = await loadJson(path.join(tokensDir, 'base.json'));
    if (stationId) {
      tokens = deepMerge(tokens, await loadJson(path.join(tokensDir, 'stations', `${stationId}.json`)));
    }
    if (screenId) {
      tokens = deepMerge(tokens, await loadJson(path.join(tokensDir, 'screens', `${screenId}.json`)));
    }
    res.json(normalizeValues(tokens));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
