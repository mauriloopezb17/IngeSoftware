import { afterAll, describe, expect, it, vi } from 'vitest';

// Redis inalcanzable: el puerto 1 no tiene ningún servicio escuchando. Valores de prueba.
vi.mock('../../src/config/entorno.js', async (importOriginal) => {
  const original = await importOriginal();
  const entorno = original.validarEntorno({
    DATABASE_URL: 'postgres://usuario:clave@localhost:5432/db_portal_cms',
    REDIS_URL: 'redis://127.0.0.1:1',
    JWT_SECRET: 'secreto-de-prueba-0123456789abcdef',
    NODE_ENV: 'test',
  });
  return { ...original, obtenerEntorno: () => entorno };
});

const { cerrarRedis, obtenerRedis } = await import('../../src/db/redis.js');

afterAll(async () => {
  await cerrarRedis();
});

describe('cliente de Redis con Redis caído', () => {
  it('falla rápido en vez de quedarse esperando', async () => {
    const inicio = performance.now();

    await expect(obtenerRedis().get('prueba:clave')).rejects.toThrow();

    expect(performance.now() - inicio).toBeLessThan(4_000);
  });

  it('cerrarRedis termina aunque Redis no responda', async () => {
    obtenerRedis();

    await expect(cerrarRedis()).resolves.toBeUndefined();
  });
});
