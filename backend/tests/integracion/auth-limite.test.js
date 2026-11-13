// El límite de intentos en los endpoints, con la base y el Redis reales.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool } from '../../src/db/index.js';
import { cerrarRedis, obtenerRedis } from '../../src/db/redis.js';
import {
  MAXIMO_FALLOS_POR_IP,
  MAXIMO_FALLOS_POR_IP_Y_CORREO,
} from '../../src/services/limiteIntentos.service.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();

const entrar = (correo, contrasena) =>
  request(app).post('/api/auth/login').send({ correo, contrasena });

async function fallarLogin(correo, veces) {
  for (let i = 0; i < veces; i++) {
    expect((await entrar(correo, 'incorrecta-1234')).status).toBe(401);
  }
}

beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('POST /api/auth/login con el límite de intentos', () => {
  it('tras 5 fallos responde 429 con Retry-After, incluso con la contraseña correcta', async () => {
    const usuario = await crearUsuarioDePrueba();
    await fallarLogin(usuario.correo, MAXIMO_FALLOS_POR_IP_Y_CORREO);

    const respuesta = await entrar(usuario.correo, usuario.contrasena);

    expect(respuesta.status).toBe(429);
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'DEMASIADAS_SOLICITUDES',
        mensaje: 'Demasiados intentos fallidos. Vuelve a intentarlo en 15 minutos.',
        detalles: [],
      },
    });
    const reintento = Number(respuesta.headers['retry-after']);
    expect(Number.isInteger(reintento)).toBe(true);
    expect(reintento).toBeGreaterThan(0);
    expect(reintento).toBeLessThanOrEqual(900);
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('el quinto fallo todavía responde 401; el bloqueo empieza en el sexto intento', async () => {
    const usuario = await crearUsuarioDePrueba();

    await fallarLogin(usuario.correo, MAXIMO_FALLOS_POR_IP_Y_CORREO);

    expect((await entrar(usuario.correo, 'otra-incorrecta-1')).status).toBe(429);
  });

  it('un correo bloqueado no impide iniciar sesión con otro correo desde la misma IP', async () => {
    const bloqueado = await crearUsuarioDePrueba();
    const otro = await crearUsuarioDePrueba();
    await fallarLogin(bloqueado.correo, MAXIMO_FALLOS_POR_IP_Y_CORREO);

    expect((await entrar(otro.correo, otro.contrasena)).status).toBe(200);
  });

  it('los intentos exitosos no cuentan', async () => {
    const usuario = await crearUsuarioDePrueba();

    for (let i = 0; i < MAXIMO_FALLOS_POR_IP_Y_CORREO + 2; i++) {
      expect((await entrar(usuario.correo, usuario.contrasena)).status).toBe(200);
    }

    expect(await obtenerRedis().keys('auth:fallos:*')).toEqual([]);
  });

  it('cuenta también los fallos de un correo que no existe (no revela cuáles existen)', async () => {
    const correo = 'no-existe@parroquia.test';
    await fallarLogin(correo, MAXIMO_FALLOS_POR_IP_Y_CORREO);

    expect((await entrar(correo, 'incorrecta-1234')).status).toBe(429);
  });

  it('cuenta también al usuario inactivo', async () => {
    const usuario = await crearUsuarioDePrueba({ activo: false });
    await fallarLogin(usuario.correo, MAXIMO_FALLOS_POR_IP_Y_CORREO);

    expect((await entrar(usuario.correo, usuario.contrasena)).status).toBe(429);
  });

  it('20 fallos con correos distintos bloquean a toda la IP', async () => {
    const usuario = await crearUsuarioDePrueba();
    for (let i = 0; i < MAXIMO_FALLOS_POR_IP; i++) {
      expect((await entrar(`nadie-${i}@parroquia.test`, 'incorrecta-1234')).status).toBe(401);
    }

    const respuesta = await entrar(usuario.correo, usuario.contrasena);

    expect(respuesta.status).toBe(429);
    expect(respuesta.headers['retry-after']).toBeDefined();
  });

  it('un cuerpo inválido (400) no cuenta como intento fallido', async () => {
    for (let i = 0; i < MAXIMO_FALLOS_POR_IP_Y_CORREO + 1; i++) {
      expect((await entrar('no-es-un-correo', 'x')).status).toBe(400);
    }

    expect(await obtenerRedis().keys('auth:fallos:*')).toEqual([]);
  });
});

describe('POST /api/auth/cambiar-contrasena comparte el límite con el login', () => {
  const cambiar = (cookie, contrasenaActual) =>
    request(app)
      .post('/api/auth/cambiar-contrasena')
      .set('Cookie', cookie)
      .send({ contrasenaActual, contrasenaNueva: 'Nueva-Contrasena-2026' });

  async function sesionDe(usuario) {
    const respuesta = await entrar(usuario.correo, usuario.contrasena);
    expect(respuesta.status).toBe(200);
    return respuesta.headers['set-cookie'][0].split(';')[0];
  }

  it('5 contraseñas actuales incorrectas bloquean el siguiente intento con 429', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await sesionDe(usuario);

    for (let i = 0; i < MAXIMO_FALLOS_POR_IP_Y_CORREO; i++) {
      expect((await cambiar(cookie, 'no-es-la-actual-123')).status).toBe(400);
    }
    const respuesta = await cambiar(cookie, usuario.contrasena);

    expect(respuesta.status).toBe(429);
    expect(respuesta.body.error.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(respuesta.headers['retry-after']).toBeDefined();
  });

  it('los fallos del login bloquean también el cambio de contraseña, y al revés', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await sesionDe(usuario);

    await fallarLogin(usuario.correo, MAXIMO_FALLOS_POR_IP_Y_CORREO);
    expect((await cambiar(cookie, usuario.contrasena)).status).toBe(429);
    expect((await entrar(usuario.correo, usuario.contrasena)).status).toBe(429);
  });

  it('un cambio de contraseña correcto no cuenta', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await sesionDe(usuario);

    expect((await cambiar(cookie, usuario.contrasena)).status).toBe(204);

    expect(await obtenerRedis().keys('auth:fallos:*')).toEqual([]);
  });

  it('una contraseña nueva inválida (400 de validación) no cuenta', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await sesionDe(usuario);

    for (let i = 0; i < MAXIMO_FALLOS_POR_IP_Y_CORREO + 1; i++) {
      const respuesta = await request(app)
        .post('/api/auth/cambiar-contrasena')
        .set('Cookie', cookie)
        .send({ contrasenaActual: usuario.contrasena, contrasenaNueva: 'corta' });
      expect(respuesta.status).toBe(400);
    }

    expect(await obtenerRedis().keys('auth:fallos:*')).toEqual([]);
  });
});
