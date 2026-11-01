import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/client',
  plugins: [react()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    // dev:client talks to dev:server through this
    proxy: {
      '/ws': { target: 'ws://localhost:4980', ws: true },
    },
  },
});
