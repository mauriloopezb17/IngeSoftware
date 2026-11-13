// Cada permiso de la matriz del contrato (sección 7) contra cada rol, con sesiones reales:
// la tabla sale de docs/api/autenticacion.md, así que un cambio del contrato que el código
// no siga rompe estas pruebas.
import cookieParser from 'cookie-parser';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ROLES } from '../../src/constantes/catalogos.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { autenticar } from '../../src/middlewares/autenticar.js';
import { requerirPermiso } from '../../src/middlewares/autorizar.js';
import { manejarErrores } from '../../src/middlewares/errores.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { matrizDePermisosDelContrato } from '../apoyo/contrato.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const matriz = matrizDePermisosDelContrato();

// Mini aplicación: una ruta protegida por cada permiso de la matriz.
const mini = express();
mini.use(cookieParser());
mini.use(autenticar);
for (const { permiso } of matriz) {
  mini.get(`/permiso/${permiso}`, requerirPermiso(permiso), (_req, res) => res.json({ ok: true }));
}
mini.use(manejarErrores);

const app = createApp();
const cookies = {};
const usuarios = {};

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  for (const rol of ROLES.codigos) {
    usuarios[rol] = await crearUsuarioDePrueba({ rol });
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuarios[rol].correo, contrasena: usuarios[rol].contrasena });
    expect(respuesta.status).toBe(200);
    cookies[rol] = respuesta.headers['set-cookie'][0].split(';')[0];
  }
});

beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('matriz de permisos contra la API', () => {
  it.each(ROLES.codigos)('%s recibe 200 con sus permisos y 403 con los demás', async (rol) => {
    const obtenido = {};
    for (const { permiso } of matriz) {
      const respuesta = await request(mini).get(`/permiso/${permiso}`).set('Cookie', cookies[rol]);
      obtenido[permiso] = respuesta.status;
    }

    const esperado = Object.fromEntries(
      matriz.map(({ permiso, roles }) => [permiso, roles.includes(rol) ? 200 : 403]),
    );
    expect(obtenido).toEqual(esperado);
  });

  it('el login y /auth/yo devuelven exactamente los permisos de la columna del rol', async () => {
    for (const rol of ROLES.codigos) {
      const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookies[rol]);

      expect(respuesta.body.datos.permisos, rol).toEqual(
        matriz.filter((fila) => fila.roles.includes(rol)).map((fila) => fila.permiso),
      );
    }
  });

  it('sin sesión todos los permisos responden 401, no 403', async () => {
    for (const { permiso } of matriz) {
      const respuesta = await request(mini).get(`/permiso/${permiso}`);

      expect(respuesta.status, permiso).toBe(401);
    }
  });

  it('un rol sin permiso recibe el cuerpo 403 del contrato', async () => {
    const respuesta = await request(mini)
      .get('/permiso/usuarios.gestionar')
      .set('Cookie', cookies.MARKETING);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    expect(respuesta.body.error.detalles).toEqual([]);
  });

  it('si desactivan al usuario, pierde todos los permisos al instante', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    expect(
      (await request(mini).get('/permiso/usuarios.gestionar').set('Cookie', cookie)).status,
    ).toBe(200);

    await consultar('UPDATE usuario SET activo = false WHERE id = $1', [usuario.id]);

    expect(
      (await request(mini).get('/permiso/usuarios.gestionar').set('Cookie', cookie)).status,
    ).toBe(401);
  });
});
