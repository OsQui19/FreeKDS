import React from 'react';
import { useNode } from '@craftjs/core';

export const Container = ({ children }) => {
  const {
    connectors: { connect, drag }
  } = useNode();
  return (
    <div ref={ref => connect(drag(ref))} style={{ padding: '10px', border: '1px dashed #ccc' }}>
      {children}
    </div>
  );
};

Container.craft = {
  displayName: 'Container'
};

export const Text = ({ text }) => {
  const {
    connectors: { connect, drag }
  } = useNode();
  return (
    <p ref={ref => connect(drag(ref))} style={{ margin: 0 }}>
      {text}
    </p>
  );
};

Text.craft = {
  props: { text: 'Text' },
  displayName: 'Text'
};
