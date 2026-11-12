// GET /api/salud y comportamiento común de la app, contra el PostgreSQL real de DATABASE_URL.
import { afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { obtenerEntorno } from '../../src/config/entorno.js';
import { cerrarPool } from '../../src/db/index.js';

const app = createApp();

afterAll(async () => {
  await cerrarPool();
});

describe('GET /api/salud', () => {
  it('responde 200 con el estado de la API y de la base de datos', async () => {
    const respuesta = await request(app).get('/api/salud');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/application\/json/);
    expect(respuesta.headers['cache-control']).toBe('no-store');
    expect(respuesta.body).toEqual({
      estado: 'ok',
      servicio: 'api-parroquia',
      fecha: expect.any(String),
      dependencias: { baseDatos: 'ok' },
    });
    expect(Number.isNaN(Date.parse(respuesta.body.fecha))).toBe(false);
  });

  it('no revela que se usa Express y envía cabeceras de seguridad', async () => {
    const respuesta = await request(app).get('/api/salud');

    expect(respuesta.headers['x-powered-by']).toBeUndefined();
    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    expect(respuesta.headers['content-security-policy']).toBeDefined();
  });
});

describe('id de petición (X-Request-Id)', () => {
  it('genera un id para cada petición', async () => {
    const respuesta = await request(app).get('/api/salud');

    expect(respuesta.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('respeta un id seguro que llega del cliente o de un proxy', async () => {
    const respuesta = await request(app).get('/api/salud').set('X-Request-Id', 'proxy-123');

    expect(respuesta.headers['x-request-id']).toBe('proxy-123');
  });

  it('reemplaza un id con caracteres no permitidos', async () => {
    const respuesta = await request(app).get('/api/salud').set('X-Request-Id', '<script>');

    expect(respuesta.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('CORS', () => {
  it('permite el origen configurado, con credenciales', async () => {
    const [origen] = obtenerEntorno().corsOrigenes;
    const respuesta = await request(app)
      .options('/api/salud')
      .set('Origin', origen)
      .set('Access-Control-Request-Method', 'PATCH');

    expect(respuesta.status).toBe(204);
    expect(respuesta.headers['access-control-allow-origin']).toBe(origen);
    expect(respuesta.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no autoriza otros orígenes', async () => {
    const respuesta = await request(app)
      .get('/api/salud')
      .set('Origin', 'https://sitio-ajeno.example');

    expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rutas inexistentes', () => {
  it('responden 404 con el formato de error del contrato', async () => {
    const respuesta = await request(app).get('/api/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: 'No existe la ruta GET /api/no-existe.',
        detalles: [],
      },
    });
  });
});
