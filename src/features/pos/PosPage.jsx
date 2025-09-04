import React from 'react';
import { LayoutProvider } from '@/contexts/LayoutContext.jsx';
import Renderer from '@/features/LayoutBuilder/Renderer.jsx';

export default function PosPage() {
  return (
    <LayoutProvider name="page-pos">
      <div className="container-fluid">
        <Renderer />
      </div>
    </LayoutProvider>
  );
}

