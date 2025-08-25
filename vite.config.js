import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-index-html',
      closeBundle() {
        const destDir = path.resolve(__dirname, 'public', 'dist');
        fs.mkdirSync(destDir, { recursive: true });
        const srcPath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(srcPath, 'utf-8');
        html = html.replace('/src/main.jsx', '/dist/app.js');
        fs.writeFileSync(path.join(destDir, 'index.html'), html);
      },
    },
  ],
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
    assetsDir: '',
    commonjsOptions: {
      defaultIsModuleExports: true,
      requireReturnsDefault: 'auto',
      include: [/node_modules/, 'node_modules/invariant/**'],
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
