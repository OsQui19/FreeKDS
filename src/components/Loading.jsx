import React from 'react';

export default function Loading({ label = 'Loading…', className = '' }) {
  return (
    <div className={`d-flex align-items-center gap-2 ${className}`} role="status" aria-live="polite">
      <div className="spinner-border spinner-border-sm" aria-hidden="true"></div>
      <span>{label}</span>
    </div>
  );
}

