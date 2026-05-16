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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mantine')) return 'mantine';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('@tabler/icons-react')) return 'icons';
            if (id.includes('xlsx')) return 'excel';
            if (id.includes('react') || id.includes('redux')) return 'vendor';
            return 'dependencies';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 5173,
    },
    host: true,
    port: 5173
  },
})
