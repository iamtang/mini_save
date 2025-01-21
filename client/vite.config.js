import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

let ip = null
function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (let dev in interfaces) {
    for (let details of interfaces[dev]) {
      if (details.family === 'IPv4' && !details.internal) {
        if(details.address.includes('192.168')){
            return details.address;
        }
        ip = details.address
      }
      
    }
  }
}
// https://vite.dev/config/
export default defineConfig({
  define: {
    // 'API_URL': JSON.stringify(`http://10.4.99.195:3000`)
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
