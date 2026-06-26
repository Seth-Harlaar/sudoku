import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages project site serves from /<repo>/. Dev keeps the root base.
// Override with VITE_BASE if you deploy elsewhere (custom domain, user page).
const base = process.env.VITE_BASE ?? '/sudoku/';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Sudoku',
        short_name: 'Sudoku',
        description: 'A polished offline Sudoku player.',
        theme_color: '#0f1117',
        background_color: '#0f1117',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
}));
