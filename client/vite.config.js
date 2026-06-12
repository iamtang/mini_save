import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // 'VITE_API_URL': JSON.stringify(`http://10.4.99.195:3000`)
    'API_URL': JSON.stringify('')
  },
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: '../dist/',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // 可以根据需要添加更多的手动分块
        },
      },
    },
  },
})
