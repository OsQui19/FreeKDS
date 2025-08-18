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
        schedule: 'src/features/Schedule/main.jsx',
        onboarding: 'src/features/Employees/onboardingMain.jsx',
        hierarchy: 'src/features/Employees/hierarchyMain.jsx',
        adminMenu: 'src/features/AdminMenu/main.jsx',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]'
      }
    },
  },
});
