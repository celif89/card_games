import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/client',
  plugins: [react()],
  build: { outDir: '../../dist/client', emptyOutDir: true },
  server: {
    host: true,
    proxy: { '/ws': { target: 'ws://localhost:3000', ws: true } },
  },
});
