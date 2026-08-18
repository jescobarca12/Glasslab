import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El frontend llama a `/api/...`; en desarrollo se redirige al backend (puerto 4000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
