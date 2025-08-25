import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      events: 'events',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: '',
    commonjsOptions: {
      defaultIsModuleExports: true,
      requireReturnsDefault: 'auto',
      include: [/node_modules/, 'node_modules/invariant/**'],
    },
    rollupOptions: {
      input: {
        app: 'index.html',
        schedule: 'src/schedule/main.jsx',
        onboarding: 'src/employees/onboardingMain.jsx',
        hierarchy: 'src/employees/hierarchyMain.jsx',
        adminMenu: 'src/features/AdminMenu/main.jsx',
        kds: 'src/features/kds/main.jsx',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    },
  },
});
