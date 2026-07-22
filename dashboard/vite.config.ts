/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const visualizerPlugin = visualizer({
  filename: 'dist/stats.html',
  open: false,
  gzipSize: true,
  brotliSize: true,
  template: 'treemap',
})

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ScoreHub · Mundial 2026',
        short_name: 'ScoreHub',
        description: 'Centro de comando de la Copa Mundial FIFA 2026',
        start_url: '/',
        display: 'standalone',
        background_color: '#070B15',
        theme_color: '#070B15',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/imagecache\.365scores\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
    ...(mode === 'analyze' ? [visualizerPlugin] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/index.ts', 'src/**/*.d.ts'],
    },
  },
}))
