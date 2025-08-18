import React from 'react';
import { Editor, Frame } from '@craftjs/core';
import * as Blocks from './components';
import { useLayout } from '@/contexts/LayoutContext.jsx';

export default function Renderer() {
  const { layout } = useLayout();
  if (!layout) return null;
  return (
    <Editor enabled={false} resolver={Blocks}>
      <Frame data={layout} />
    </Editor>
  );
}
