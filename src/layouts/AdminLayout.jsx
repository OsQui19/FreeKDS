import React, { useEffect } from 'react';
import BaseLayout from './BaseLayout.jsx';
import { emit } from '@/plugins/lifecycle.js';

export default function AdminLayout({ children }) {
  useEffect(() => {
    emit('onAdminOpen');
    return () => emit('onAdminClose');
  }, []);

  return (
    <BaseLayout>
      <main className="flex-grow-1 container py-3">{children}</main>
    </BaseLayout>
  );
}
