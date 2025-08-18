const tokenCache = {};

function buildKey(options = {}) {
  const { stationId, screenId } = options;
  return `${stationId || 'base'}-${screenId || 'base'}`;
}

export async function resolveTokens(options = {}) {
  const key = buildKey(options);
  if (tokenCache[key]) return tokenCache[key];
  const params = new URLSearchParams();
  if (options.stationId) params.append('stationId', options.stationId);
  if (options.screenId) params.append('screenId', options.screenId);
  const qs = params.toString();
  const res = await fetch(`/api/tokens${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to load tokens');
  const tokens = await res.json();
  tokenCache[key] = tokens;
  return tokens;
}

export async function getToken(path, options) {
  const tokens = await resolveTokens(options);
  return path
    .split('.')
    .reduce((obj, part) => (obj ? obj[part] : undefined), tokens)?.$value;
}

export default { resolveTokens, getToken };
