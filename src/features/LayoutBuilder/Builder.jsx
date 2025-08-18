import React from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import * as Blocks from './components';
import { useLayout } from '@/contexts/LayoutContext.jsx';

function SaveButton() {
  const { query } = useEditor();
  const { saveLayout } = useLayout();
  return <button onClick={() => saveLayout(query.serialize())}>Save Layout</button>;
}

export default function Builder() {
  const { layout } = useLayout();
  return (
    <Editor resolver={Blocks}>
      <SaveButton />
      <Frame data={layout}>
        <Element is={Blocks.Grid} canvas>
          <Blocks.Header text="Edit me" />
        </Element>
      </Frame>
    </Editor>
  );
}
