// Sin almacenamiento configurado, solo la subida de archivos responde 503: el resto de la API sigue.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

for (const nombre of [
  'OCI_S3_ENDPOINT',
  'OCI_S3_REGION',
  'OCI_S3_BUCKET_NAME',
  'OCI_S3_ACCESS_KEY_ID',
  'OCI_S3_SECRET_ACCESS_KEY',
  'CDN_PUBLIC_URL',
]) {
  vi.stubEnv(nombre, '');
}

const { createApp } = await import('../../src/app.js');
const { cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
let cookie;

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const usuario = await crearUsuarioDePrueba();
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  cookie = respuesta.headers['set-cookie'][0].split(';')[0];
});

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('almacenamiento sin configurar', () => {
  it('la subida responde 503 con un mensaje claro', async () => {
    const respuesta = await request(app)
      .post('/api/admin/multimedia')
      .set('Cookie', cookie)
      .attach('archivo', Buffer.from('%PDF-1.4\n'), 'prueba.pdf');

    expect(respuesta.status).toBe(503);
    expect(respuesta.body.error).toMatchObject({
      codigo: 'SERVICIO_NO_DISPONIBLE',
      mensaje: expect.stringContaining('no está configurado'),
    });
  });

  it('el resto de la API sigue funcionando', async () => {
    expect((await request(app).get('/api/salud')).status).toBe(200);
    expect((await request(app).get('/api/sedes')).status).toBe(200);
    expect((await request(app).get('/api/auth/yo').set('Cookie', cookie)).status).toBe(200);
  });

  it('sin sesión se sigue pidiendo iniciar sesión antes que nada', async () => {
    const respuesta = await request(app).post('/api/admin/multimedia');
    expect(respuesta.status).toBe(401);
  });
});
