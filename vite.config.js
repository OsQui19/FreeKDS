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
    sourcemap: true,
    minify: false,
    chunkSizeWarningLimit: 1600,
    commonjsOptions: {
      defaultIsModuleExports: true,
      requireReturnsDefault: 'auto',
      include: [/node_modules/, 'node_modules/invariant/**'],
    },
    rollupOptions: {
      input: {
        app: 'index.html',
      },
    },
  },
});
