import React from 'react';
import { Editor, Frame } from '@craftjs/core';
import { Container, Text } from './components';
import { useLayout } from '@/contexts/LayoutContext.jsx';

export default function Renderer() {
  const { layout } = useLayout();
  if (!layout) return null;
  return (
    <Editor enabled={false} resolver={{ Container, Text }}>
      <Frame data={layout} />
    </Editor>
  );
}
