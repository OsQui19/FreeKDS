const logger = require('../utils/logger');
const unitsById = {};
const unitsByAbbr = {};

function loadUnits(db, cb) {
  db.query("SELECT id, abbreviation, type, to_base FROM units", (err, rows) => {
    if (err) {
      logger.error("Error loading units:", err);
      if (cb) cb(err);
      return;
    }
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
    if (cb) cb(null);
  });
}

function convert(amount, fromId, toId) {
  if (fromId === toId || amount === 0) return amount;
  const from = unitsById[fromId];
  const to = unitsById[toId];
  if (!from || !to || from.type !== to.type) return null;
  return (amount * from.toBase) / to.toBase;
}

module.exports = { loadUnits, convert };
