import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo, las llamadas a /api se reenvían al backend.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
