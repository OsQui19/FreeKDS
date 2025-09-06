import React from 'react';
import { PluginProvider } from '@/plugins/PluginManager.jsx';
import { ToastProvider } from '@/contexts/ToastContext.jsx';
import { ConfirmProvider } from '@/contexts/ConfirmContext.jsx';
import BaseLayout from './BaseLayout.jsx';

export default function LayoutWrap({ children }) {
  return (
    <PluginProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BaseLayout>{children}</BaseLayout>
        </ConfirmProvider>
      </ToastProvider>
    </PluginProvider>
  );
}
