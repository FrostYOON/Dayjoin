import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: '/',
        name: 'Dayjoin · 함께하는 일정과 나의 기록',
        short_name: 'Dayjoin',
        description: '일정과 가계부를 한 캘린더에서',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the public UI only. Auth and business data must stay on the server.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/auth(?:\/|$)/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      // Keep the development preview free of persistent service-worker caches.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
})
