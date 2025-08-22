import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  plugins: [react(), commonjs()],
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      events: 'events',
    },
  },
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    commonjsOptions: {
      defaultIsModuleExports: true,
    },
    rollupOptions: {
      input: {
        schedule: 'src/schedule/main.jsx',
        onboarding: 'src/employees/onboardingMain.jsx',
        hierarchy: 'src/employees/hierarchyMain.jsx',
        adminMenu: 'src/features/AdminMenu/main.jsx',
        app: 'src/main.jsx',
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
