const React = require('react');

function MenuPanel() {
  return (
    <div>Menu administration panel</div>
  );
}

module.exports = {
  id: 'menu',
  title: 'Menu',
  Component: MenuPanel,
  requiredDomains: ['menu'],
  requiredScopes: ['menu:read', 'menu:write'],
  latency: 'interactive',
};
