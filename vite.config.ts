import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/client',
  // Ścieżki względne — gra działa pod dowolnym adresem (np. GitHub Pages: /card_games/).
  base: './',
  plugins: [react()],
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { host: true },
});
