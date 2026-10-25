import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep validation and framework code independently cacheable. Route chunks
        // still own charts, dialogs and other page-specific dependencies.
        manualChunks(id) {
          if (id.includes('/node_modules/zod/')) return 'validation'
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return 'react'
        },
      },
    },
  },
})
