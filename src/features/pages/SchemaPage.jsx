import React from 'react';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext.jsx';
import Renderer from '@/features/LayoutBuilder/Renderer.jsx';

function Inner({ fallback }) {
  const { layout } = useLayout();
  if (layout) return <Renderer />;
  return fallback || null;
}

export default function SchemaPage({ name, fallback, stationId }) {
  return (
    <LayoutProvider name={name} stationId={stationId}>
      <Inner fallback={fallback} />
    </LayoutProvider>
  );
}

