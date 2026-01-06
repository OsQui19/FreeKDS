import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAccess } from '@/contexts/AccessContext.jsx';
import Breadcrumbs from '@/components/Breadcrumbs.jsx';
import { adminNavItems } from '@/admin/nav.js';

function NavItem({ to, children, icon }) {
  return (
    <li className="nav-item">
      <NavLink
        to={to}
        end={to === '/admin'}
        className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'active' : ''}`}
      >
        {icon && <i className={`bi ${icon}`} aria-hidden="true"></i>}
        <span>{children}</span>
      </NavLink>
    </li>
  );
}

export default function AdminShell() {
  const { has, loading } = useAccess();
  const [showNav, setShowNav] = React.useState(false);
  const location = useLocation();
  const items = adminNavItems;
  const visible = items.filter((it) => !it.module || has(it.module) || loading);
  const current = React.useMemo(() => {
    const path = location.pathname.replace(/\/$/, '');
    const found = items.find((it) => it.to === path) || items.find((it)=> path.startsWith(it.to));
    return found ? found.label : 'Admin';
  }, [location.pathname]);
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className={`col-12 col-md-3 col-lg-2 mb-3 ${showNav ? '' : 'd-none d-md-block'}`}>
          <div className="card-surface p-3 admin-sidebar">
            <h5 className="mb-3">Admin</h5>
            <ul className="nav flex-column gap-1">
              {visible.map((it) => (
                <NavItem key={it.to} to={it.to} icon={it.icon}>{it.label}</NavItem>
              ))}
            </ul>
          </div>
        </aside>
        <main className="col-12 col-md-9 col-lg-10">
          <button className="btn btn-outline-secondary btn-sm admin-sidebar-toggle mb-2" onClick={() => setShowNav((v)=>!v)}>{showNav ? 'Hide' : 'Menu'}</button>
          <div className="admin-header">
            <div className="d-flex align-items-center gap-2">
              <h2 className="m-0">{current}</h2>
              <span className="chip d-none d-md-inline">Admin</span>
            </div>
            <Breadcrumbs />
          </div>
          <div className="admin-content">
          <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
