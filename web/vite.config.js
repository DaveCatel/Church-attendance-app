import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API runs on :8000; proxying keeps everything same-origin in development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
})
