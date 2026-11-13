// Con CACHE_HABILITADA=false (el valor de las pruebas, ver vitest.config.js) todo se lee de
// PostgreSQL: no hay cabecera X-Cache y no se escribe nada en Redis.
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { PREFIJO_CACHE } from '../../src/constantes/cache.js';

const { createApp } = await import('../../src/app.js');
const { cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis, obtenerRedis } = await import('../../src/db/redis.js');
const { invalidarRecursos } = await import('../../src/services/cache.service.js');

const app = createApp();

afterAll(async () => {
  await cerrarPool();
  await cerrarRedis();
});

describe('con la caché apagada', () => {
  it('responde desde la base, sin X-Cache y sin escribir en Redis', async () => {
    const antes = await obtenerRedis().keys(`${PREFIJO_CACHE}:*`);

    const respuesta = await request(app).get('/api/sedes/senor-de-la-exaltacion/horarios');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['x-cache']).toBeUndefined();
    expect(await obtenerRedis().keys(`${PREFIJO_CACHE}:*`)).toEqual(antes);
  });

  it('invalidar no hace nada (no crea claves)', async () => {
    const antes = await obtenerRedis().keys(`${PREFIJO_CACHE}:*`);
    await invalidarRecursos(1, ['horarios']);
    expect(await obtenerRedis().keys(`${PREFIJO_CACHE}:*`)).toEqual(antes);
  });
});
