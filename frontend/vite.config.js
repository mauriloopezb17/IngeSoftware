import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

// El backend local escucha en el 3000. Las e2e pueden usar otro puerto (E2E_PUERTO_API) para no chocar
// con otro backend que ya esté corriendo en la misma máquina.
const puertoApi = process.env.E2E_PUERTO_API || '3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo, las llamadas a /api se reenvían al backend.
    proxy: {
      '/api': `http://localhost:${puertoApi}`,
    },
  },
})
