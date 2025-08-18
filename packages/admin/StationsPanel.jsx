import React from 'react';

function StationsPanel() {
  return <div>Stations configuration panel</div>;
}

StationsPanel.meta = {
  id: 'stations',
  title: 'Stations',
  dataDomains: ['stations'],
  scopes: ['stations:read', 'stations:write'],
  latency: 'deferred',
};

export default StationsPanel;
