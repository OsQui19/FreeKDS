import React from 'react';

function MenuPanel() {
  return <div>Menu administration panel</div>;
}

MenuPanel.meta = {
  id: 'menu',
  title: 'Menu',
  dataDomains: ['menu'],
  scopes: ['menu:read', 'menu:write'],
  latency: 'interactive',
};

export default MenuPanel;
