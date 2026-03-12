import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { mockApiPlugin } from './dev-mock-api';

export default defineConfig({
  plugins: [
    react(),
    mockApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: '진실체크 - 딥페이크 판별',
        short_name: '진실체크',
        description: '받은 링크를 붙여넣으면 AI가 딥페이크를 판별해 드립니다',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#1B3A5C',
        lang: 'ko',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        share_target: {
          action: '/',
          method: 'GET',
          params: { url: 'shared_url' },
        } as any,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkOnly' as const,
          },
        ],
      },
    }),
  ],
  server: {},
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
