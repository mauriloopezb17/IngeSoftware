import { afterAll, describe, expect, it } from 'vitest';
import { cerrarRedis, obtenerRedis } from '../../src/db/redis.js';

afterAll(async () => {
  await cerrarRedis();
});

describe('cliente compartido de Redis (Redis local)', () => {
  it('responde a PING y guarda y lee valores con caducidad', async () => {
    const redis = obtenerRedis();

    expect(await redis.ping()).toBe('PONG');

    await redis.set('prueba:redis:clave', 'valor', 'EX', 10);
    expect(await redis.get('prueba:redis:clave')).toBe('valor');
    await redis.del('prueba:redis:clave');
  });

  it('devuelve siempre el mismo cliente', () => {
    expect(obtenerRedis()).toBe(obtenerRedis());
  });

  it('crea un cliente nuevo después de cerrarlo y cerrar dos veces no falla', async () => {
    const anterior = obtenerRedis();

    await cerrarRedis();
    await cerrarRedis();

    const nuevo = obtenerRedis();
    expect(nuevo).not.toBe(anterior);
    expect(await nuevo.ping()).toBe('PONG');
  });
});
