// Pruebas de integración de la jerarquía de sedes (PAR-171, Parte 1).
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { reiniciarEstadoDeRedis } from '../../src/services/cache.service.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
const prefijo = `j-${randomUUID().slice(0, 6)}`;
const sedesCreadas = [];
const sesiones = {};

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function crearSedeAdmin(payload) {
  const res = await request(app)
    .post('/api/admin/sedes')
    .set('Cookie', sesiones.admin)
    .send(payload);
  if (res.status === 201) {
    sedesCreadas.push(res.body.datos.id);
  }
  return res;
}

let parroquiaId;
let capillaId;
let comunidadId;
let pasionistaId;

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  reiniciarEstadoDeRedis();

  const admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  const secretaria = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
  const parroco = await crearUsuarioDePrueba({ rol: 'PARROCO' });
  sesiones.admin = await iniciarSesion(admin);
  sesiones.secretaria = await iniciarSesion(secretaria);
  sesiones.parroco = await iniciarSesion(parroco);

  const p = await crearSedeAdmin({
    nombre: `Parroquia ${prefijo} Base`,
    slug: `${prefijo}-parroquia`,
    tipo: 'PARROQUIA',
    orden: 10,
    activo: true,
  });
  expect(p.status).toBe(201);
  parroquiaId = p.body.datos.id;

  const c = await crearSedeAdmin({
    nombre: `Capilla ${prefijo} Base`,
    slug: `${prefijo}-capilla`,
    tipo: 'CAPILLA',
    sedePadreId: parroquiaId,
    orden: 5,
    activo: true,
  });
  expect(c.status).toBe(201);
  capillaId = c.body.datos.id;

  const com = await crearSedeAdmin({
    nombre: `Comunidad ${prefijo} Base`,
    slug: `${prefijo}-comunidad`,
    tipo: 'COMUNIDAD',
    sedePadreId: capillaId,
    orden: 2,
    activo: true,
  });
  expect(com.status).toBe(201);
  comunidadId = com.body.datos.id;

  const pas = await crearSedeAdmin({
    nombre: `Comunidad Pasionista ${prefijo}`,
    slug: `${prefijo}-pasionista`,
    tipo: 'COMUNIDAD_PASIONISTA',
    orden: 1,
    activo: true,
  });
  expect(pas.status).toBe(201);
  pasionistaId = pas.body.datos.id;
});

afterAll(async () => {
  if (sedesCreadas.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad IN ('sede', 'sede_red_social') AND entidad_id = ANY($1::text[])",
      [sedesCreadas.map(String)],
    );
    await consultar('DELETE FROM sede_red_social WHERE sede_id = ANY($1)', [sedesCreadas]);
    for (const id of [...sedesCreadas].reverse()) {
      await consultar('DELETE FROM sede WHERE id = $1', [id]);
    }
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('Reglas de jerarquía al crear y editar sedes', () => {
  it.each([
    ['PARROQUIA sin padre', () => ({ tipo: 'PARROQUIA', sedePadreId: null }), 201],
    ['PARROQUIA con padre', () => ({ tipo: 'PARROQUIA', sedePadreId: parroquiaId }), 400],
    ['CAPILLA bajo PARROQUIA', () => ({ tipo: 'CAPILLA', sedePadreId: parroquiaId }), 201],
    ['CAPILLA sin padre', () => ({ tipo: 'CAPILLA', sedePadreId: null }), 400],
    ['CAPILLA bajo CAPILLA', () => ({ tipo: 'CAPILLA', sedePadreId: capillaId }), 400],
    ['CAPILLA bajo COMUNIDAD', () => ({ tipo: 'CAPILLA', sedePadreId: comunidadId }), 400],
    [
      'CAPILLA bajo COMUNIDAD_PASIONISTA',
      () => ({ tipo: 'CAPILLA', sedePadreId: pasionistaId }),
      400,
    ],
    ['COMUNIDAD bajo PARROQUIA', () => ({ tipo: 'COMUNIDAD', sedePadreId: parroquiaId }), 201],
    ['COMUNIDAD bajo CAPILLA', () => ({ tipo: 'COMUNIDAD', sedePadreId: capillaId }), 201],
    ['COMUNIDAD sin padre', () => ({ tipo: 'COMUNIDAD', sedePadreId: null }), 400],
    ['COMUNIDAD bajo COMUNIDAD', () => ({ tipo: 'COMUNIDAD', sedePadreId: comunidadId }), 400],
    [
      'COMUNIDAD bajo COMUNIDAD_PASIONISTA',
      () => ({ tipo: 'COMUNIDAD', sedePadreId: pasionistaId }),
      400,
    ],
    [
      'COMUNIDAD_PASIONISTA sin padre',
      () => ({ tipo: 'COMUNIDAD_PASIONISTA', sedePadreId: null }),
      201,
    ],
    [
      'COMUNIDAD_PASIONISTA con padre',
      () => ({ tipo: 'COMUNIDAD_PASIONISTA', sedePadreId: parroquiaId }),
      400,
    ],
  ])('%s → HTTP %i', async (caso, buildPayload, esperado) => {
    const sufijo = randomUUID().slice(0, 6);
    const res = await crearSedeAdmin({
      nombre: `Caso ${prefijo} ${sufijo}`,
      slug: `${prefijo}-c-${sufijo}`,
      ...buildPayload(),
    });
    expect(res.status, caso).toBe(esperado);
    if (esperado === 400) {
      expect(res.body.error.codigo).toBe('VALIDACION');
      expect(res.body.error.detalles[0].campo).toBe('sedePadreId');
    }
  });

  it('rechaza ciclos directos e indirectos', async () => {
    // Ciclo directo: una sede debajo de sí misma
    const directo = await request(app)
      .post(`/api/admin/sedes/${capillaId}/mover`)
      .set('Cookie', sesiones.admin)
      .send({ sedePadreId: capillaId });
    expect(directo.status).toBe(400);
    expect(directo.body.error.detalles[0].campo).toBe('sedePadreId');

    // Ciclo indirecto: en DB forzamos un escenario de verificación o intentamos poner a una
    // capilla debajo de su propia comunidad hija (ambas rechazadas: tanto por tipo como por ciclo).
    // Para probar específicamente ciclo sin bloqueo previo de tipo, creamos dos nodos temporalmente:
    const parRes = await crearSedeAdmin({
      nombre: `Ciclo Par ${prefijo}`,
      slug: `${prefijo}-ciclo-p`,
      tipo: 'PARROQUIA',
    });
    const capRes = await crearSedeAdmin({
      nombre: `Ciclo Cap ${prefijo}`,
      slug: `${prefijo}-ciclo-c`,
      tipo: 'CAPILLA',
      sedePadreId: parRes.body.datos.id,
    });
    const comRes = await crearSedeAdmin({
      nombre: `Ciclo Com ${prefijo}`,
      slug: `${prefijo}-ciclo-com`,
      tipo: 'COMUNIDAD',
      sedePadreId: capRes.body.datos.id,
    });

    const indirecto = await request(app)
      .patch(`/api/admin/sedes/${parRes.body.datos.id}`)
      .set('Cookie', sesiones.admin)
      .send({ sedePadreId: comRes.body.datos.id });
    expect(indirecto.status).toBe(400);
  });

  it('rechaza con 409 cambiar el tipo si sus hijas dejarían de cumplir la jerarquía', async () => {
    const res = await request(app)
      .patch(`/api/admin/sedes/${parroquiaId}`)
      .set('Cookie', sesiones.admin)
      .send({ tipo: 'COMUNIDAD_PASIONISTA' });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CONFLICTO');
  });

  it('rechaza con 409 desactivar una sede que tiene hijas activas', async () => {
    const res = await request(app)
      .patch(`/api/admin/sedes/${capillaId}`)
      .set('Cookie', sesiones.admin)
      .send({ activo: false });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CONFLICTO');
  });
});

describe('Mover, reordenar, permisos y árbol', () => {
  it('solo Administrador puede mover sedes (403 otros roles, 401 sin sesión)', async () => {
    const sinSesion = await request(app)
      .post(`/api/admin/sedes/${comunidadId}/mover`)
      .send({ sedePadreId: parroquiaId, orden: 1 });
    expect(sinSesion.status).toBe(401);

    for (const cookie of [sesiones.secretaria, sesiones.parroco]) {
      const prohibido = await request(app)
        .post(`/api/admin/sedes/${comunidadId}/mover`)
        .set('Cookie', cookie)
        .send({ sedePadreId: parroquiaId, orden: 1 });
      expect(prohibido.status).toBe(403);
    }
  });

  it('mueve una comunidad de capilla a parroquia, reordena e invalida la caché del árbol público', async () => {
    // 1) Calentar caché pública
    const antes = await request(app).get('/api/sedes/arbol');
    expect(antes.status).toBe(200);
    const parroquiaAntes = antes.body.datos.parroquias.find((p) => p.id === parroquiaId);
    expect(parroquiaAntes).toBeDefined();
    expect(parroquiaAntes.capillas.find((c) => c.id === capillaId).comunidades).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: comunidadId })]),
    );
    expect(antes.body.datos.comunidadesPasionistas).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: pasionistaId })]),
    );

    // 2) Mover comunidad directamente bajo parroquia con orden 0
    const movida = await request(app)
      .post(`/api/admin/sedes/${comunidadId}/mover`)
      .set('Cookie', sesiones.admin)
      .send({ sedePadreId: parroquiaId, orden: 0 });
    expect(movida.status).toBe(200);
    expect(movida.body.datos.sedePadre.id).toBe(parroquiaId);
    expect(movida.body.datos.orden).toBe(0);

    // 3) Verificar que el árbol público refleja el cambio de inmediato (caché invalidada)
    const despues = await request(app).get('/api/sedes/arbol');
    expect(despues.status).toBe(200);
    const parroquiaDespues = despues.body.datos.parroquias.find((p) => p.id === parroquiaId);
    expect(parroquiaDespues.comunidades).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: comunidadId })]),
    );
    expect(
      parroquiaDespues.capillas
        .find((c) => c.id === capillaId)
        .comunidades.some((c) => c.id === comunidadId),
    ).toBe(false);
  });

  it('ordena hermanas por orden y nombre, y excluye sedes inactivas en el árbol público', async () => {
    const cB = await crearSedeAdmin({
      nombre: `Capilla Zeta ${prefijo}`,
      slug: `${prefijo}-cap-z`,
      tipo: 'CAPILLA',
      sedePadreId: parroquiaId,
      orden: 1,
      activo: true,
    });
    const cA = await crearSedeAdmin({
      nombre: `Capilla Alfa ${prefijo}`,
      slug: `${prefijo}-cap-a`,
      tipo: 'CAPILLA',
      sedePadreId: parroquiaId,
      orden: 1,
      activo: true,
    });
    const cInactiva = await crearSedeAdmin({
      nombre: `Capilla Inactiva ${prefijo}`,
      slug: `${prefijo}-cap-inact`,
      tipo: 'CAPILLA',
      sedePadreId: parroquiaId,
      orden: 0,
      activo: false,
    });

    const publico = await request(app).get('/api/sedes/arbol');
    expect(publico.status).toBe(200);
    const parroquia = publico.body.datos.parroquias.find((p) => p.id === parroquiaId);
    const ids = parroquia.capillas.map((c) => c.id);

    expect(ids).not.toContain(cInactiva.body.datos.id);
    // orden 1 (Alfa antes de Zeta por nombre) antes que orden 5 (Base)
    expect(ids.indexOf(cA.body.datos.id)).toBeLessThan(ids.indexOf(cB.body.datos.id));
    expect(ids.indexOf(cB.body.datos.id)).toBeLessThan(ids.indexOf(capillaId));

    // El admin árbol sí incluye la inactiva
    const adminArbol = await request(app)
      .get('/api/admin/sedes/arbol')
      .set('Cookie', sesiones.admin);
    expect(adminArbol.status).toBe(200);
    const parroquiaAdmin = adminArbol.body.datos.parroquias.find((p) => p.id === parroquiaId);
    expect(parroquiaAdmin.capillas.some((c) => c.id === cInactiva.body.datos.id)).toBe(true);
  });
});
