// ADR-02: si Redis no responde, el login sigue funcionando sin límite de intentos y la
// advertencia queda en el log. Se simula un cliente de Redis cuyos comandos fallan.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const redisCaido = vi.hoisted(() => {
  const errorDeConexion = () =>
    Object.assign(new Error('Connection is closed.'), { code: 'EPIPE' });
  const pipeline = {
    get: () => pipeline,
    pttl: () => pipeline,
    exec: vi.fn(() => Promise.reject(errorDeConexion())),
  };
  return {
    cliente: {
      pipeline: vi.fn(() => pipeline),
      eval: vi.fn(() => Promise.reject(errorDeConexion())),
    },
  };
});

vi.mock('../../src/db/redis.js', () => ({
  obtenerRedis: () => redisCaido.cliente,
  cerrarRedis: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { cerrarPool } = await import('../../src/db/index.js');
const { exigirIntentosDisponibles, registrarIntentoFallido } =
  await import('../../src/services/limiteIntentos.service.js');
const { borrarUsuariosDePrueba, crearUsuarioDePrueba } = await import('../apoyo/usuarios.js');

const app = createApp();

beforeEach(() => vi.clearAllMocks());

afterAll(async () => {
  await borrarUsuariosDePrueba();
  await cerrarPool();
});

describe('con Redis caído', () => {
  it('el login con credenciales correctas sigue funcionando', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['set-cookie']).toBeDefined();
    expect(redisCaido.cliente.pipeline).toHaveBeenCalled();
  });

  it('los intentos fallidos responden 401 siempre, sin llegar nunca a 429', async () => {
    const usuario = await crearUsuarioDePrueba();

    for (let i = 0; i < 8; i++) {
      const respuesta = await request(app)
        .post('/api/auth/login')
        .send({ correo: usuario.correo, contrasena: 'incorrecta-1234' });
      expect(respuesta.status).toBe(401);
    }
  });

  it('el cambio de contraseña también sigue funcionando', async () => {
    const usuario = await crearUsuarioDePrueba();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const respuesta = await request(app)
      .post('/api/auth/cambiar-contrasena')
      .set('Cookie', cookie)
      .send({ contrasenaActual: usuario.contrasena, contrasenaNueva: 'Nueva-Contrasena-2026' });

    expect(respuesta.status).toBe(204);
  });

  it('registra la advertencia en el log al saltarse el límite', async () => {
    const log = { warn: vi.fn() };

    await expect(
      exigirIntentosDisponibles({ ip: '203.0.113.10', correo: 'a@parroquia.test' }, log),
    ).resolves.toBeUndefined();
    await expect(
      registrarIntentoFallido({ ip: '203.0.113.10', correo: 'a@parroquia.test' }, log),
    ).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledTimes(2);
    expect(log.warn.mock.calls[0][0]).toEqual({ motivo: 'EPIPE' });
    expect(log.warn.mock.calls[0][1]).toMatch(/Redis no responde/);
    // La advertencia nunca incluye el correo ni la IP.
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('a@parroquia.test');
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('203.0.113.10');
  });

  it('/api/salud no cambia: solo informa de la base de datos', async () => {
    const respuesta = await request(app).get('/api/salud');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.dependencias).toEqual({ baseDatos: 'ok' });
  });
});
