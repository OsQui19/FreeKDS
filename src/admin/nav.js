export const adminNavItems = [
  { to: '/admin', label: 'Overview', icon: 'bi-house' },
  { to: '/admin/reports', label: 'Reports', module: 'reports', icon: 'bi-graph-up' },
  { to: '/admin/menu', label: 'Menu & Items', module: 'menu', icon: 'bi-list' },
  { to: '/admin/inventory', label: 'Inventory', module: 'inventory', icon: 'bi-box' },
  { to: '/admin/suppliers', label: 'Suppliers', module: 'inventory', icon: 'bi-truck' },
  { to: '/admin/purchase-orders', label: 'Purchase Orders', module: 'inventory', icon: 'bi-receipt' },
  { to: '/admin/locations', label: 'Locations', module: 'inventory', icon: 'bi-geo-alt' },
  { to: '/admin/employees', label: 'Employees', module: 'employees', icon: 'bi-people' },
  { to: '/admin/roles', label: 'Roles & Access', module: 'employees', icon: 'bi-shield-lock' },
  { to: '/admin/timeclock', label: 'Time Clock', module: 'employees', icon: 'bi-clock-history' },
  { to: '/admin/payroll', label: 'Payroll', module: 'employees', icon: 'bi-cash-coin' },
  { to: '/admin/stations', label: 'Devices & Stations', module: 'stations', icon: 'bi-display' },
  { to: '/admin/studio', label: 'Design Studio', module: 'theme', icon: 'bi-palette' },
  { to: '/admin/integrations', label: 'Integrations', module: 'updates', icon: 'bi-plug' },
  { to: '/admin/settings', label: 'Settings', module: 'updates', icon: 'bi-gear' },
  { to: '/admin/backups', label: 'Backups', module: 'backup', icon: 'bi-hdd-stack' },
];

export function findAdminLabel(pathname) {
  const path = String(pathname || '').replace(/\/$/, '');
  const found = adminNavItems.find((it) => it.to === path) || adminNavItems.find((it) => path.startsWith(it.to));
  return found ? found.label : 'Admin';
}

