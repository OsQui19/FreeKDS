import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { adminNavItems } from '@/admin/nav.js';

export default function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const crumbs = [];
  let acc = '';
  for (let i = 0; i < parts.length; i += 1) {
    acc += `/${parts[i]}`;
    const item = adminNavItems.find((it) => it.to === acc);
    const label = item ? item.label : parts[i].replace(/-/g, ' ').replace(/\b\w/g, (c)=> c.toUpperCase());
    crumbs.push({ to: acc, label });
  }
  return (
    <nav aria-label="breadcrumb" className="small text-muted">
      {crumbs.map((c, i) => (
        <span key={c.to}>
          {i > 0 && <span className="mx-1 bi bi-chevron-right" aria-hidden="true"></span>}
          {i < crumbs.length - 1 ? (
            <Link to={c.to} className="text-muted">{c.label}</Link>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

