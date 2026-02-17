import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/gateway': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  define: {
    // Make env vars accessible
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL ?? ''),
    'import.meta.env.VITE_VOICE_URL': JSON.stringify(process.env.VITE_VOICE_URL ?? ''),
    'import.meta.env.VITE_GATEWAY_URL': JSON.stringify(process.env.VITE_GATEWAY_URL ?? ''),
  },
})
