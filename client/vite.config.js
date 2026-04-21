import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // Split bundle so vendor libraries cache separately from app code.
        // Libraries rarely change → browsers keep the cached copy across deploys,
        // so visitors only re-download the small app chunk when we push updates.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/node_modules[\\/](framer-motion|motion-utils|motion-dom)[\\/]/.test(id)) {
            return 'vendor-motion';
          }
          if (/node_modules[\\/](swiper|ssr-window|dom7)[\\/]/.test(id)) {
            return 'vendor-swiper';
          }
          if (/node_modules[\\/]react-icons[\\/]/.test(id)) {
            return 'vendor-icons';
          }
          if (/node_modules[\\/](react-toastify|react-helmet-async)[\\/]/.test(id)) {
            return 'vendor-ui';
          }
          return 'vendor';
        },
      },
    },
  },
})
