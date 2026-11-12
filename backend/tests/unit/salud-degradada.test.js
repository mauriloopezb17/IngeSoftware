import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// PostgreSQL simulado caído: verificarConexion siempre falla.
vi.mock('../../src/db/index.js', () => ({
  verificarConexion: vi.fn(() =>
    Promise.reject(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })),
  ),
}));

const { createApp } = await import('../../src/app.js');

describe('GET /api/salud con la base de datos caída', () => {
  it('responde 503 con estado degradado', async () => {
    const respuesta = await request(createApp()).get('/api/salud');

    expect(respuesta.status).toBe(503);
    expect(respuesta.headers['cache-control']).toBe('no-store');
    expect(respuesta.body).toMatchObject({
      estado: 'degradado',
      servicio: 'api-parroquia',
      dependencias: { baseDatos: 'error' },
    });
  });
});
