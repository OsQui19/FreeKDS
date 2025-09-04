import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAccess } from '@/contexts/AccessContext.jsx';

export default function RequireAccess({ module: mod, children }) {
  const { loading, has } = useAccess();
  if (loading) return <div className="admin-section">Loading…</div>;
  if (!has(mod)) return <Navigate to={`/admin?err=${encodeURIComponent('No access')}`} replace />;
  return <>{children}</>;
}
