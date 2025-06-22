const unitMap = {
  lb: { type: 'weight', toBase: 453.592 },
  oz: { type: 'weight', toBase: 28.3495 },
  g:  { type: 'weight', toBase: 1 },
  kg: { type: 'weight', toBase: 1000 },
  l:  { type: 'volume', toBase: 1000 },
  ml: { type: 'volume', toBase: 1 },
  ea: { type: 'count', toBase: 1 }
};

const idMap = {
  1: 'lb',
  2: 'oz',
  3: 'g',
  4: 'kg',
  5: 'l',
  6: 'ml',
  7: 'ea'
};

function convert(amount, fromId, toId) {
  if (fromId === toId || amount === 0) return amount;
  const fromAbbr = idMap[fromId];
  const toAbbr = idMap[toId];
  const from = unitMap[fromAbbr];
  const to = unitMap[toAbbr];
  if (!from || !to || from.type !== to.type) return null;
  return (amount * from.toBase) / to.toBase;
}

module.exports = { convert };
