import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/arenagrid-api': {
        target: 'https://auction-api.arenagrid.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arenagrid-api/, '/api'),
        secure: false,
      },
    },
  },
  preview: {
    proxy: {
      '/arenagrid-api': {
        target: 'https://auction-api.arenagrid.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/arenagrid-api/, '/api'),
        secure: false,
      },
    },
  },
})
