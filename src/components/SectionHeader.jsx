import React from 'react';

export default function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <div>
        <h3 className="m-0">{title}</h3>
        {subtitle && <div className="text-muted small mt-1">{subtitle}</div>}
      </div>
      {actions && (
        <div className="d-flex align-items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

