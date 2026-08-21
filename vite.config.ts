import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'favicon-16.png', 'favicon-32.png'],
      manifest: {
        name: 'Defter',
        short_name: 'Defter',
        description: 'Notlarınız tek yerde',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0c0c10',
        theme_color: '#0c0c10',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // API istekleri her zaman ağdan; yetkilendirme gerektirir, önbelleğe alınmaz
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
            method: 'GET',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})