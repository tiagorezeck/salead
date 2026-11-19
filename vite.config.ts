import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: false,
  },
  build: {
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('@tanstack/react-router') ||
              id.includes('@tanstack/react-query')
            ) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('@supabase/')) return 'vendor-supabase';
            if (
              id.includes('@radix-ui/') ||
              id.includes('/motion/') ||
              id.includes('/framer-motion/') ||
              id.includes('cmdk') ||
              id.includes('vaul') ||
              id.includes('sonner') ||
              id.includes('react-day-picker')
            ) {
              return 'vendor-ui';
            }
          }
        },
      },
    },
  },
})