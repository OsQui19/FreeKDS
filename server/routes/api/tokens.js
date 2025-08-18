const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const tokensDir = path.join(__dirname, '..', '..', '..', 'tokens');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const src = source[key];
    if (src && typeof src === 'object' && !Array.isArray(src) && !('value' in src)) {
      target[key] = deepMerge(target[key] || {}, src);
    } else {
      target[key] = src;
    }
  }
  return target;
}

async function loadJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
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
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
