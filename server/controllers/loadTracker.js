const stationLoad = {};

function incrementLoad(stationId, count) {
  if (!stationId) return;
  stationLoad[stationId] = (stationLoad[stationId] || 0) + count;
}

module.exports = {
  stationLoad,
  incrementLoad,
};
