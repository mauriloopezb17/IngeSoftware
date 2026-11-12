import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/salud', () => {
  it('responde 200 con el estado de la API', async () => {
    const respuesta = await request(app).get('/api/salud');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/application\/json/);
    expect(respuesta.body.estado).toBe('ok');
    expect(respuesta.body.servicio).toBe('api-parroquia');
    expect(Number.isNaN(Date.parse(respuesta.body.fecha))).toBe(false);
  });

  it('no revela que se usa Express', async () => {
    const respuesta = await request(app).get('/api/salud');

    expect(respuesta.headers['x-powered-by']).toBeUndefined();
  });
});
