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

// Update base tokens. Requires authentication even though the path is public
// for GET in the auth middleware.
router.post('/tokens', async (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const incoming = req.body || {};
    // Defensive copy and shallow validation
    if (typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }
    const { stationId, screenId } = req.query || {};
    let targetPath;
    if (stationId) {
      const dir = path.join(tokensDir, 'stations');
      await fs.mkdir(dir, { recursive: true });
      targetPath = path.join(dir, `${stationId}.json`);
    } else if (screenId) {
      const dir = path.join(tokensDir, 'screens');
      await fs.mkdir(dir, { recursive: true });
      targetPath = path.join(dir, `${screenId}.json`);
    } else {
      targetPath = path.join(tokensDir, 'base.json');
    }
    const current = await loadJson(targetPath);
    const merged = normalizeValues(deepMerge(current, incoming));
    await fs.writeFile(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
    res.json({ success: true, path: targetPath });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
