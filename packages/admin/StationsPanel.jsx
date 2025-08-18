const React = require('react');

function StationsPanel() {
  return (
    <div>Stations configuration panel</div>
  );
}

module.exports = {
  id: 'stations',
  title: 'Stations',
  Component: StationsPanel,
  requiredDomains: ['stations'],
  requiredScopes: ['stations:read', 'stations:write'],
  latency: 'deferred',
};
