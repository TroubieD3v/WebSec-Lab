import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server: the dashboard on :3000, API calls proxied to the FastAPI control plane.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
