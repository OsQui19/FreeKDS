import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
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
