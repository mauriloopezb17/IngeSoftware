// Expiración real de la sesión: con JWT_EXPIRA_EN de 2 segundos se espera a que venza.
// Contrato (autenticacion.md, sección 1): la sesión no se renueva sola y, al vencer, la
// siguiente petición responde 401 y la cookie se borra.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/config/entorno.js', async (importOriginal) => {
  const original = await importOriginal();
  const entorno = original.validarEntorno({ ...process.env, JWT_EXPIRA_EN: '2s' });
  return { ...original, obtenerEntorno: () => entorno };
});

const { createApp } = await import('../../src/app.js');
const { cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const { limpiarContadoresDeIntentos } = await import('../apoyo/limite.js');
const { borrarUsuariosDePrueba, crearUsuarioDePrueba } = await import('../apoyo/usuarios.js');

const app = createApp();

// El token vence entre 1 y 2 segundos después del login (sus tiempos son en segundos enteros).
const ESPERA_HASTA_VENCER_MS = 2_300;
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

async function iniciarSesion() {
  const usuario = await crearUsuarioDePrueba();
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);

  return {
    usuario,
    login: respuesta.body.datos,
    cookie: respuesta.headers['set-cookie'][0].split(';')[0],
    cabeceraCookie: respuesta.headers['set-cookie'][0],
  };
}

describe('expiración de la sesión', () => {
  it('la cookie y sesionExpiraEn duran lo que dice JWT_EXPIRA_EN', async () => {
    const { login, cabeceraCookie } = await iniciarSesion();

    expect(cabeceraCookie).toContain('Max-Age=2');
    const segundos = (Date.parse(login.sesionExpiraEn) - Date.now()) / 1000;
    expect(segundos).toBeGreaterThan(0);
    expect(segundos).toBeLessThanOrEqual(2.5);
  });

  it('antes de vencer la sesión sirve y no se renueva sola', async () => {
    const { login, cookie } = await iniciarSesion();

    const primera = await request(app).get('/api/auth/yo').set('Cookie', cookie);
    const segunda = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(primera.body.datos.sesionExpiraEn).toBe(login.sesionExpiraEn);
    expect(segunda.body.datos.sesionExpiraEn).toBe(login.sesionExpiraEn);
    expect(primera.headers['set-cookie']).toBeUndefined();
  });

  it('al vencer responde 401 con el mensaje del contrato y borra la cookie', async () => {
    const { cookie } = await iniciarSesion();
    expect((await request(app).get('/api/auth/yo').set('Cookie', cookie)).status).toBe(200);

    await esperar(ESPERA_HASTA_VENCER_MS);
    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.',
        detalles: [],
      },
    });
    expect(respuesta.headers['set-cookie'][0]).toMatch(/^parroquia_sesion=;.*Max-Age=0/);
  });

  it('con la sesión vencida tampoco se puede cambiar la contraseña, y se puede volver a entrar', async () => {
    const { usuario, cookie } = await iniciarSesion();

    await esperar(ESPERA_HASTA_VENCER_MS);
    const cambio = await request(app)
      .post('/api/auth/cambiar-contrasena')
      .set('Cookie', cookie)
      .send({ contrasenaActual: usuario.contrasena, contrasenaNueva: 'Nueva-Contrasena-2026' });
    const otraVez = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });

    expect(cambio.status).toBe(401);
    expect(otraVez.status).toBe(200);
  });
});
