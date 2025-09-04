import React from 'react';
import { PluginProvider } from '@/plugins/PluginManager.jsx';
import BaseLayout from './BaseLayout.jsx';

export default function LayoutWrap({ children }) {
  return (
    <PluginProvider>
      <BaseLayout>{children}</BaseLayout>
    </PluginProvider>
  );
}
