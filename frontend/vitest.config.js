import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuración separada de vite.config.js: las pruebas no necesitan Tailwind.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // Las pruebas end-to-end (Playwright) viven en e2e/ y se ejecutan aparte.
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
