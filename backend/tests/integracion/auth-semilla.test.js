// Los cuatro usuarios de desarrollo del seed (contraseña Parroquia2026!, solo desarrollo y pruebas)
// pueden iniciar sesión y tienen el rol y la sede que dice el contrato. El login anota
// fecha_ultimo_acceso: se guarda el valor original y se restaura al terminar.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { permisosDe } from '../../src/constantes/permisos.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';

const app = createApp();
const CONTRASENA_DE_DESARROLLO = 'Parroquia2026!';

const USUARIOS_DEL_SEED = [
  ['admin@parroquia.test', 'ADMINISTRADOR', 'Administrador'],
  ['parroco@parroquia.test', 'PARROCO', 'Párroco'],
  ['secretaria@parroquia.test', 'SECRETARIA', 'Secretaría'],
  ['marketing@parroquia.test', 'MARKETING', 'Marketing'],
];

let accesosOriginales;

beforeAll(async () => {
  const { rows } = await consultar(
    'SELECT id, fecha_ultimo_acceso FROM usuario WHERE correo = ANY($1)',
    [USUARIOS_DEL_SEED.map(([correo]) => correo)],
  );
  accesosOriginales = rows;
});

beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  for (const { id, fecha_ultimo_acceso: fecha } of accesosOriginales) {
    await consultar('UPDATE usuario SET fecha_ultimo_acceso = $2 WHERE id = $1', [id, fecha]);
  }
  await limpiarContadoresDeIntentos();
  await cerrarPool();
  await cerrarRedis();
});

describe('usuarios de desarrollo del seed', () => {
  it.each(USUARIOS_DEL_SEED)('%s inicia sesión como %s', async (correo, codigo, nombre) => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo, contrasena: CONTRASENA_DE_DESARROLLO });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toMatchObject({
      correo,
      rol: { codigo, nombre },
      sede: { id: 1, slug: 'senor-de-la-exaltacion' },
      permisos: permisosDe(codigo),
    });
  });

  it('la contraseña de desarrollo distingue mayúsculas', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@parroquia.test', contrasena: 'parroquia2026!' });

    expect(respuesta.status).toBe(401);
  });

  it('el correo del seed se acepta en mayúsculas', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'SECRETARIA@Parroquia.TEST', contrasena: CONTRASENA_DE_DESARROLLO });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.rol.codigo).toBe('SECRETARIA');
  });
});
