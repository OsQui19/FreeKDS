import React from 'react';

function MenuPanel() {
  return <div>Menu administration panel</div>;
}

MenuPanel.meta = {
  id: 'menu',
  title: 'Menu',
  dataDomain: 'menu',
  scopes: ['menu:read', 'menu:write'],
  latencyClass: 'interactive',
};

export default MenuPanel;
