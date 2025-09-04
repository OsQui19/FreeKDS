import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAccess } from '@/contexts/AccessContext.jsx';

function NavItem({ to, children }) {
  return (
    <li className="nav-item">
      <NavLink
        to={to}
        end={to === '/admin'}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        {children}
      </NavLink>
    </li>
  );
}

export default function AdminShell() {
  const { has, loading } = useAccess();
  const [showNav, setShowNav] = React.useState(false);
  const items = [
    { to: '/admin', label: 'Overview' },
    { to: '/admin/employees', label: 'Employees', module: 'employees' },
    { to: '/admin/roles', label: 'Roles & Access', module: 'employees' },
    { to: '/admin/inventory', label: 'Inventory', module: 'inventory' },
    { to: '/admin/suppliers', label: 'Suppliers', module: 'inventory' },
    { to: '/admin/purchase-orders', label: 'Purchase Orders', module: 'inventory' },
    { to: '/admin/menu', label: 'Menu', module: 'menu' },
    { to: '/admin/stations', label: 'Stations', module: 'stations' },
    { to: '/admin/schedule', label: 'Schedule', module: 'employees' },
    { to: '/admin/timeclock', label: 'Time Clock', module: 'employees' },
    { to: '/admin/payroll', label: 'Payroll', module: 'employees' },
    { to: '/admin/theme', label: 'Theme', module: 'theme' },
    { to: '/admin/appearance', label: 'Appearance', module: 'theme' },
    { to: '/admin/layouts', label: 'Layouts', module: 'menu' },
    { to: '/admin/flags', label: 'Feature Flags', module: 'updates' },
    { to: '/admin/backups', label: 'Backups', module: 'backup' },
  ];
  const visible = items.filter((it) => !it.module || has(it.module) || loading);
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className={`col-12 col-md-3 col-lg-2 mb-3 ${showNav ? '' : 'd-none d-md-block'}`}>
          <div className="card-surface p-3">
            <h5 className="mb-3">Admin</h5>
            <ul className="nav flex-column">
              {visible.map((it) => (
                <NavItem key={it.to} to={it.to}>{it.label}</NavItem>
              ))}
            </ul>
          </div>
        </aside>
        <main className="col-12 col-md-9 col-lg-10">
          <button className="btn btn-outline-secondary btn-sm admin-sidebar-toggle mb-2" onClick={() => setShowNav((v)=>!v)}>{showNav ? 'Hide' : 'Menu'}</button>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
