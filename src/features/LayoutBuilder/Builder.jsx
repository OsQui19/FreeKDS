import React from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import * as Blocks from './components';
import { useLayout } from '@/contexts/LayoutContext.jsx';

function SaveButton() {
  const { query } = useEditor();
  const { saveLayout } = useLayout();
  return <button onClick={() => saveLayout(query.serialize())}>Save Layout</button>;
}

function Controls({ renderControls }) {
  const { query } = useEditor();
  const { saveLayout } = useLayout();
  if (typeof renderControls === 'function') {
    return renderControls({
      serialize: () => query.serialize(),
      saveDraft: () => saveLayout(query.serialize()),
    });
  }
  return <SaveButton />;
}

export default function Builder({ renderControls }) {
  const { layout } = useLayout();
  return (
    <Editor resolver={Blocks}>
      <Controls renderControls={renderControls} />
      <Frame data={layout}>
        <Element is={Blocks.Grid} canvas>
          <Blocks.Header text="Edit me" />
        </Element>
      </Frame>
    </Editor>
  );
}
