import baseTokens from '../../tokens/base.json';
import station1 from '../../tokens/stations/1.json';
import screen1 from '../../tokens/screens/1.json';

const stationTokens = { '1': station1 };
const screenTokens = { '1': screen1 };

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

export function resolveTokens(options = {}) {
  const { stationId, screenId } = options;
  let tokens = deepMerge({}, baseTokens);
  if (stationId && stationTokens[stationId]) {
    tokens = deepMerge(tokens, stationTokens[stationId]);
  }
  if (screenId && screenTokens[screenId]) {
    tokens = deepMerge(tokens, screenTokens[screenId]);
  }
  return tokens;
}

export function getToken(path, options) {
  const tokens = resolveTokens(options);
  return path.split('.').reduce((obj, part) => (obj ? obj[part] : undefined), tokens)?.value;
}

export default { resolveTokens, getToken };
