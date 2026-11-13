// Gestión de usuarios en el panel CMS (/api/admin/usuarios) contra PostgreSQL real.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();

const sesiones = {};
const usuarios = {};
const usuariosApiCreados = [];
let sedePrincipalId;

async function iniciarSesion(correo, contrasena) {
  const respuesta = await request(app).post('/api/auth/login').send({ correo, contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows: sedesRows } = await consultar('SELECT id FROM sede WHERE slug = $1', [
    SEDE_PRINCIPAL,
  ]);
  sedePrincipalId = sedesRows[0].id;

  for (const [nombre, opts] of [
    ['admin', { rol: 'ADMINISTRADOR', sede: null }],
    ['parroco', { rol: 'PARROCO' }],
    ['secretaria', { rol: 'SECRETARIA' }],
    ['marketing', { rol: 'MARKETING' }],
  ]) {
    usuarios[nombre] = await crearUsuarioDePrueba(opts);
    sesiones[nombre] = await iniciarSesion(usuarios[nombre].correo, usuarios[nombre].contrasena);
  }
});

afterAll(async () => {
  if (usuariosApiCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'usuario' AND entidad_id = ANY($1::text[])",
      [usuariosApiCreados],
    );
    await consultar('DELETE FROM bitacora_cambio WHERE usuario_id = ANY($1)', [usuariosApiCreados]);
    await consultar('DELETE FROM usuario WHERE id = ANY($1)', [usuariosApiCreados]);
  }
  await consultar("DELETE FROM bitacora_cambio WHERE entidad = 'usuario' AND entidad_id = $1", [
    String(usuarios.admin.id),
  ]);
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('Permisos en /api/admin/usuarios', () => {
  it('sin sesión responde 401 y cualquier rol distinto a Administrador recibe 403', async () => {
    const sinSesion = await request(app).get('/api/admin/usuarios');
    expect(sinSesion.status).toBe(401);

    for (const rol of ['parroco', 'secretaria', 'marketing']) {
      const lista = await request(app).get('/api/admin/usuarios').set('Cookie', sesiones[rol]);
      expect(lista.status).toBe(403);
      expect(lista.body.error.codigo).toBe('SIN_PERMISO');

      const crear = await request(app)
        .post('/api/admin/usuarios')
        .set('Cookie', sesiones[rol])
        .send({});
      expect(crear.status).toBe(403);
    }
  });
});

describe('GET /api/admin/usuarios y GET /api/admin/usuarios/:id', () => {
  it('lista paginada sin exponer hash_contrasena y soporta filtros rol, sede, activo, buscar y orden', async () => {
    const res = await request(app)
      .get('/api/admin/usuarios?pagina=1&porPagina=10&orden=nombreCompleto')
      .set('Cookie', sesiones.admin);

    expect(res.status).toBe(200);
    expect(res.body.paginacion).toMatchObject({
      pagina: 1,
      porPagina: 10,
      total: expect.any(Number),
      totalPaginas: expect.any(Number),
    });
    expect(res.body.datos.length).toBeGreaterThanOrEqual(4);

    for (const u of res.body.datos) {
      expect(u).not.toHaveProperty('hashContrasena');
      expect(u).not.toHaveProperty('hash_contrasena');
      expect(u).toEqual({
        id: expect.any(Number),
        nombreCompleto: expect.any(String),
        correo: expect.any(String),
        rol: { codigo: expect.any(String), nombre: expect.any(String) },
        sede:
          u.sede === null
            ? null
            : { id: expect.any(Number), nombre: expect.any(String), slug: expect.any(String) },
        activo: expect.any(Boolean),
        fechaUltimoAcceso: u.fechaUltimoAcceso === null ? null : expect.any(String),
        fechaCreacion: expect.any(String),
      });
    }

    const soloSec = await request(app)
      .get(`/api/admin/usuarios?rol=SECRETARIA&sede=${SEDE_PRINCIPAL}&activo=true`)
      .set('Cookie', sesiones.admin);
    expect(soloSec.status).toBe(200);
    expect(soloSec.body.datos.every((u) => u.rol.codigo === 'SECRETARIA' && u.activo)).toBe(true);

    const busqueda = await request(app)
      .get('/api/admin/usuarios?buscar=parroco')
      .set('Cookie', sesiones.admin);
    expect(busqueda.status).toBe(200);
    expect(busqueda.body.datos.some((u) => u.correo === 'parroco@parroquia.test')).toBe(true);

    const detalle = await request(app)
      .get(`/api/admin/usuarios/${usuarios.secretaria.id}`)
      .set('Cookie', sesiones.admin);
    expect(detalle.status).toBe(200);
    expect(detalle.body.datos.id).toBe(usuarios.secretaria.id);
    expect(detalle.body.datos).not.toHaveProperty('hashContrasena');

    const noExiste = await request(app)
      .get('/api/admin/usuarios/99999999')
      .set('Cookie', sesiones.admin);
    expect(noExiste.status).toBe(404);
  });
});

describe('POST, PATCH y restablecer-contrasena en /api/admin/usuarios', () => {
  it('crea usuario, valida sede y correo único sin distinguir mayúsculas, y oculta el hash en bitácora', async () => {
    const sinSede = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', sesiones.admin)
      .send({
        nombreCompleto: 'Sin Sede',
        correo: `sinsede-${randomUUID()}@parroquia.test`,
        rol: 'SECRETARIA',
        contrasena: 'Temporal-Obrajes-2026',
      });
    expect(sinSede.status).toBe(400);
    expect(sinSede.body.error.detalles).toContainEqual(
      expect.objectContaining({ campo: 'sedeId' }),
    );

    const correoPrueba = `Nuevo.Usuario-${randomUUID()}@parroquia.test`;
    const creado = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', sesiones.admin)
      .send({
        nombreCompleto: 'María Elena Quispe Prueba',
        correo: correoPrueba,
        rol: 'SECRETARIA',
        sedeId: sedePrincipalId,
        contrasena: 'Temporal-Obrajes-2026',
        activo: true,
      });

    expect(creado.status).toBe(201);
    usuariosApiCreados.push(creado.body.datos.id);
    expect(creado.headers.location).toBe(`/api/admin/usuarios/${creado.body.datos.id}`);
    expect(creado.body.datos).toMatchObject({
      nombreCompleto: 'María Elena Quispe Prueba',
      correo: correoPrueba.toLowerCase(),
      rol: { codigo: 'SECRETARIA', nombre: 'Secretaría' },
      sede: { id: sedePrincipalId, slug: SEDE_PRINCIPAL },
      activo: true,
    });
    expect(creado.body.datos).not.toHaveProperty('hashContrasena');
    expect(creado.body.datos).not.toHaveProperty('hash_contrasena');

    // Correo duplicado ignorando mayúsculas -> 409 CONFLICTO.
    const duplicado = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', sesiones.admin)
      .send({
        nombreCompleto: 'Duplicado',
        correo: correoPrueba.toUpperCase(),
        rol: 'SECRETARIA',
        sedeId: sedePrincipalId,
        contrasena: 'Temporal-Obrajes-2026',
      });
    expect(duplicado.status).toBe(409);

    const { rows: bitacora } = await consultar(
      "SELECT accion, datos_nuevos FROM bitacora_cambio WHERE entidad = 'usuario' AND entidad_id = $1",
      [String(creado.body.datos.id)],
    );
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0].datos_nuevos.hash_contrasena).toBe('[oculto]');

    // Puede iniciar sesión con la contraseña creada.
    await iniciarSesion(correoPrueba.toLowerCase(), 'Temporal-Obrajes-2026');
  });

  it('impide desactivarse o quitarse el rol a sí mismo (409) y permite editar y restablecer contraseña', async () => {
    const autoDesactivar = await request(app)
      .patch(`/api/admin/usuarios/${usuarios.admin.id}`)
      .set('Cookie', sesiones.admin)
      .send({ activo: false });
    expect(autoDesactivar.status).toBe(409);
    expect(autoDesactivar.body.error.codigo).toBe('CONFLICTO');

    const autoQuitarRol = await request(app)
      .patch(`/api/admin/usuarios/${usuarios.admin.id}`)
      .set('Cookie', sesiones.admin)
      .send({ rol: 'SECRETARIA', sedeId: sedePrincipalId });
    expect(autoQuitarRol.status).toBe(409);
    expect(autoQuitarRol.body.error.codigo).toBe('CONFLICTO');

    const correo = `editable-${randomUUID()}@parroquia.test`;
    const creado = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', sesiones.admin)
      .send({
        nombreCompleto: 'Usuario Editable',
        correo,
        rol: 'MARKETING',
        sedeId: sedePrincipalId,
        contrasena: 'Clave-Inicial-2026!',
      });
    expect(creado.status).toBe(201);
    const id = creado.body.datos.id;
    usuariosApiCreados.push(id);

    const editado = await request(app)
      .patch(`/api/admin/usuarios/${id}`)
      .set('Cookie', sesiones.admin)
      .send({
        nombreCompleto: 'Usuario Promovido',
        rol: 'ADMINISTRADOR',
        sedeId: null,
        activo: true,
      });
    expect(editado.status).toBe(200);
    expect(editado.body.datos).toMatchObject({
      nombreCompleto: 'Usuario Promovido',
      rol: { codigo: 'ADMINISTRADOR', nombre: 'Administrador' },
      sede: null,
    });
    expect(editado.body.datos).not.toHaveProperty('hashContrasena');

    const resetInvalido = await request(app)
      .post(`/api/admin/usuarios/${id}/restablecer-contrasena`)
      .set('Cookie', sesiones.admin)
      .send({ contrasenaNueva: 'corta' });
    expect(resetInvalido.status).toBe(400);

    const resetOk = await request(app)
      .post(`/api/admin/usuarios/${id}/restablecer-contrasena`)
      .set('Cookie', sesiones.admin)
      .send({ contrasenaNueva: 'Nueva-Clave-Segura-2026!' });
    expect(resetOk.status).toBe(204);

    // La nueva contraseña funciona y la anterior ya no.
    const loginVieja = await request(app)
      .post('/api/auth/login')
      .send({ correo, contrasena: 'Clave-Inicial-2026!' });
    expect(loginVieja.status).toBe(401);

    await iniciarSesion(correo, 'Nueva-Clave-Segura-2026!');

    const desactivado = await request(app)
      .patch(`/api/admin/usuarios/${id}`)
      .set('Cookie', sesiones.admin)
      .send({ activo: false });
    expect(desactivado.status).toBe(200);
    expect(desactivado.body.datos.activo).toBe(false);
  });
});
