// Middlewares autenticar, requerirPermiso, requerirRol y filtrarPorSede con usuarios reales
// (temporales) en una mini aplicación, más el router /api/admin de la aplicación real.
import cookieParser from 'cookie-parser';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { PERMISOS } from '../../src/constantes/permisos.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { autenticar } from '../../src/middlewares/autenticar.js';
import { filtrarPorSede, requerirPermiso, requerirRol } from '../../src/middlewares/autorizar.js';
import { manejarErrores } from '../../src/middlewares/errores.js';
import { validar } from '../../src/middlewares/validar.js';
import { exigirSedeDelRecurso, sedeParaCrear } from '../../src/utils/alcanceSede.js';
import { slug } from '../../src/validacion/comunes.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

// Mini aplicación con una ruta por regla.
const mini = express();
mini.use(cookieParser());
mini.use(express.json());
mini.use(autenticar);
const ok = (_req, res) => res.json({ ok: true });
mini.get('/permiso-bitacora', requerirPermiso(PERMISOS.BITACORA_VER), ok);
mini.get(
  '/permiso-con-mensaje',
  requerirPermiso(
    PERMISOS.NOTICIAS_PUBLICAR,
    'Tu rol no tiene permiso para aprobar publicaciones.',
  ),
  ok,
);
mini.get('/rol-admin-parroco', requerirRol('ADMINISTRADOR', 'PARROCO'), ok);
mini.get(
  '/lista',
  validar({ query: z.object({ sede: slug.optional() }) }),
  filtrarPorSede,
  (req, res) => res.json({ sede: req.sedeFiltro ?? null }),
);
mini.post('/crear', (req, res) =>
  res.json({ sedeId: sedeParaCrear(req.usuario, req.body.sedeId) ?? null }),
);
mini.get('/recurso/:sedeId', (req, res) => {
  exigirSedeDelRecurso(req.usuario, Number(req.params.sedeId));
  res.json({ ok: true });
});
mini.use(manejarErrores);

const app = createApp();
let otraSedeId;
let otraSedeSlug;
const usuarios = {};

// Inicia sesión con la aplicación real y devuelve la cabecera Cookie.
async function cookieDe(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

const cookies = {};

beforeAll(async () => {
  // Una segunda sede, temporal, para probar los recursos de otra sede.
  otraSedeSlug = `prueba-otra-sede-${Date.now()}`;
  const { rows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede WHERE nombre = 'Capilla'), 'Capilla de prueba', $1)
     RETURNING id`,
    [otraSedeSlug],
  );
  otraSedeId = rows[0].id;

  for (const rol of ['ADMINISTRADOR', 'PARROCO', 'SECRETARIA', 'MARKETING']) {
    usuarios[rol] = await crearUsuarioDePrueba({ rol });
    cookies[rol] = await cookieDe(usuarios[rol]);
  }
  usuarios.ADMIN_SIN_SEDE = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  cookies.ADMIN_SIN_SEDE = await cookieDe(usuarios.ADMIN_SIN_SEDE);
  usuarios.PARROCO_SIN_SEDE = await crearUsuarioDePrueba({ rol: 'PARROCO', sede: null });
  cookies.PARROCO_SIN_SEDE = await cookieDe(usuarios.PARROCO_SIN_SEDE);
});

afterAll(async () => {
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE slug = $1', [otraSedeSlug]);
  await cerrarPool();
});

describe('autenticar', () => {
  it('sin sesión responde 401 en cualquier ruta protegida', async () => {
    const respuesta = await request(mini).get('/permiso-bitacora');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('NO_AUTENTICADO');
  });
});

describe('requerirPermiso', () => {
  it.each([
    ['ADMINISTRADOR', 200],
    ['PARROCO', 200],
    ['SECRETARIA', 403],
    ['MARKETING', 403],
  ])('bitacora.ver con %s: %i', async (rol, estado) => {
    const respuesta = await request(mini).get('/permiso-bitacora').set('Cookie', cookies[rol]);

    expect(respuesta.status).toBe(estado);
    if (estado === 403) {
      expect(respuesta.body).toEqual({
        error: {
          codigo: 'SIN_PERMISO',
          mensaje: 'No tienes permiso para realizar esta acción.',
          detalles: [],
        },
      });
    }
  });

  it('usa el mensaje indicado por la ruta', async () => {
    const respuesta = await request(mini)
      .get('/permiso-con-mensaje')
      .set('Cookie', cookies.MARKETING);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.mensaje).toBe(
      'Tu rol no tiene permiso para aprobar publicaciones.',
    );
  });

  it('un cambio de rol en la base se nota en la siguiente petición', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
    const cookie = await cookieDe(usuario);
    expect((await request(mini).get('/permiso-bitacora').set('Cookie', cookie)).status).toBe(403);

    await consultar(
      "UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE nombre = 'Párroco') WHERE id = $1",
      [usuario.id],
    );

    expect((await request(mini).get('/permiso-bitacora').set('Cookie', cookie)).status).toBe(200);
  });
});

describe('requerirRol', () => {
  it.each([
    ['ADMINISTRADOR', 200],
    ['PARROCO', 200],
    ['SECRETARIA', 403],
    ['MARKETING', 403],
  ])('con %s: %i', async (rol, estado) => {
    const respuesta = await request(mini).get('/rol-admin-parroco').set('Cookie', cookies[rol]);

    expect(respuesta.status).toBe(estado);
  });
});

describe('filtrarPorSede', () => {
  const lista = (rol, consulta = '') =>
    request(mini).get(`/lista${consulta}`).set('Cookie', cookies[rol]);

  it('el Administrador ve todas las sedes o la que pida', async () => {
    expect((await lista('ADMINISTRADOR')).body).toEqual({ sede: null });
    expect((await lista('ADMIN_SIN_SEDE', `?sede=${otraSedeSlug}`)).body).toEqual({
      sede: otraSedeSlug,
    });
  });

  it('los demás roles quedan fijados a su sede', async () => {
    for (const rol of ['PARROCO', 'SECRETARIA', 'MARKETING']) {
      expect((await lista(rol)).body).toEqual({ sede: 'senor-de-la-exaltacion' });
      expect((await lista(rol, '?sede=senor-de-la-exaltacion')).body).toEqual({
        sede: 'senor-de-la-exaltacion',
      });
    }
  });

  it('piden otra sede: 403 SIN_PERMISO', async () => {
    const respuesta = await lista('SECRETARIA', `?sede=${otraSedeSlug}`);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error).toEqual({
      codigo: 'SIN_PERMISO',
      mensaje: 'Este recurso pertenece a otra sede.',
      detalles: [],
    });
  });

  it('un filtro con formato inválido sigue siendo 400', async () => {
    const respuesta = await lista('SECRETARIA', '?sede=No%20Es%20Slug');

    expect(respuesta.status).toBe(400);
  });

  it('un Párroco sin sede asignada no consulta nada', async () => {
    const respuesta = await lista('PARROCO_SIN_SEDE');

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.mensaje).toBe('Tu usuario no tiene una sede asignada.');
  });
});

describe('sede al crear y recursos de otra sede', () => {
  it('el Administrador crea en la sede del cuerpo; los demás en la suya, ignorando el cuerpo', async () => {
    const comoAdmin = await request(mini)
      .post('/crear')
      .set('Cookie', cookies.ADMIN_SIN_SEDE)
      .send({ sedeId: otraSedeId });
    const comoSecretaria = await request(mini)
      .post('/crear')
      .set('Cookie', cookies.SECRETARIA)
      .send({ sedeId: otraSedeId });

    expect(comoAdmin.body).toEqual({ sedeId: otraSedeId });
    expect(comoSecretaria.body).toEqual({ sedeId: 1 });
  });

  it('leer un recurso de la propia sede: 200; de otra sede: 403', async () => {
    const propio = await request(mini).get('/recurso/1').set('Cookie', cookies.MARKETING);
    const ajeno = await request(mini)
      .get(`/recurso/${otraSedeId}`)
      .set('Cookie', cookies.MARKETING);

    expect(propio.status).toBe(200);
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.mensaje).toBe('Este recurso pertenece a otra sede.');
  });

  it('el Administrador accede a recursos de cualquier sede', async () => {
    const respuesta = await request(mini)
      .get(`/recurso/${otraSedeId}`)
      .set('Cookie', cookies.ADMINISTRADOR);

    expect(respuesta.status).toBe(200);
  });
});

describe('/api/admin en la aplicación real', () => {
  it('sin sesión responde 401 aunque la ruta no exista', async () => {
    const respuesta = await request(app).get('/api/admin/lo-que-sea');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it('con sesión, una ruta que no existe sigue siendo 404', async () => {
    const respuesta = await request(app)
      .get('/api/admin/lo-que-sea')
      .set('Cookie', cookies.SECRETARIA);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('NO_ENCONTRADO');
  });
});
