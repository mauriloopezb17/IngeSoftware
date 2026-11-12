import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Las pruebas de integración comparten una sola base de datos:
    // los archivos se ejecutan uno tras otro para evitar choques.
    fileParallelism: false,
    testTimeout: 10000,
  },
});
