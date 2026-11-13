import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Las pruebas de integración comparten una sola base de datos:
    // los archivos se ejecutan uno tras otro para evitar choques.
    fileParallelism: false,
    testTimeout: 10000,
    // Las pruebas de integración escriben directo en la base y esperan verlo en el portal: la
    // caché va apagada, salvo en las pruebas de la propia caché (que la activan con vi.stubEnv).
    env: { CACHE_HABILITADA: 'false' },
  },
});
