import React from 'react';

function StationsPanel() {
  return <div>Stations configuration panel</div>;
}

StationsPanel.meta = {
  id: 'stations',
  title: 'Stations',
  dataDomain: 'stations',
  scopes: ['stations:read', 'stations:write'],
  latencyClass: 'deferred',
};

export default StationsPanel;
