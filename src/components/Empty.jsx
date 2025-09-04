import React from 'react';

export default function Empty({ title = 'Nothing here yet', detail = '', className = '' }) {
  return (
    <div className={`text-center text-muted ${className}`}> 
      <div className="mb-1">{title}</div>
      {detail && <div className="small">{detail}</div>}
    </div>
  );
}

