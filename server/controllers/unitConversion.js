const logger = require('../../utils/logger');
const { query } = require('../../utils/db');
const unitsById = {};
const unitsByAbbr = {};

async function loadUnits(db) {
  try {
    const [rows] = await query(
      db,
      'SELECT id, abbreviation, type, to_base FROM units',
    );
    const byId = {};
    const byAbbr = {};
    rows.forEach((r) => {
      byId[r.id] = {
        abbr: r.abbreviation,
        type: r.type,
        toBase: parseFloat(r.to_base),
      };
      byAbbr[r.abbreviation] = {
        id: r.id,
        type: r.type,
        toBase: parseFloat(r.to_base),
      };
    });
    Object.keys(unitsById).forEach((k) => delete unitsById[k]);
    Object.keys(byId).forEach((k) => {
      unitsById[k] = byId[k];
    });
    Object.keys(unitsByAbbr).forEach((k) => delete unitsByAbbr[k]);
    Object.keys(byAbbr).forEach((k) => {
      unitsByAbbr[k] = byAbbr[k];
    });
  } catch (err) {
    logger.error('Error loading units:', err);
    throw err;
  }
}

function convert(amount, fromId, toId) {
  if (fromId === toId || amount === 0) return amount;
  const from = unitsById[fromId];
  const to = unitsById[toId];
  if (!from || !to || from.type !== to.type) return null;
  return (amount * from.toBase) / to.toBase;
}

module.exports = { loadUnits, convert };
