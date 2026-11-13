// Gestión de servicios y preguntas frecuentes en el panel CMS (/api/admin/servicios).
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
const serviciosCreados = [];
const preguntasCreadas = [];
const conversacionesCreadas = [];
let sedeAjena;

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function crearServicioApi(quien, cuerpo) {
  const res = await request(app)
    .post('/api/admin/servicios')
    .set('Cookie', sesiones[quien])
    .send(cuerpo);
  if (res.status === 201) serviciosCreados.push(res.body.datos.id);
  return res;
}

async function crearPreguntaApi(quien, servicioId, cuerpo) {
  const res = await request(app)
    .post(`/api/admin/servicios/${servicioId}/preguntas-frecuentes`)
    .set('Cookie', sesiones[quien])
    .send(cuerpo);
  if (res.status === 201) preguntasCreadas.push(res.body.datos.id);
  return res;
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows: sedesRows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede servicios', $1)
     RETURNING id, slug, nombre`,
    [`prueba-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = sedesRows[0];

  for (const [nombre, opts] of [
    ['admin', { rol: 'ADMINISTRADOR', sede: null }],
    ['parroco', { rol: 'PARROCO' }],
    ['secretaria', { rol: 'SECRETARIA' }],
    ['marketing', { rol: 'MARKETING' }],
    ['ajeno', { rol: 'SECRETARIA', sede: sedeAjena.slug }],
  ]) {
    usuarios[nombre] = await crearUsuarioDePrueba(opts);
    sesiones[nombre] = await iniciarSesion(usuarios[nombre]);
  }
});

afterAll(async () => {
  if (conversacionesCreadas.length > 0) {
    await consultar('DELETE FROM mensaje_bot WHERE conversacion_id = ANY($1)', [
      conversacionesCreadas,
    ]);
    await consultar('DELETE FROM conversacion_bot WHERE id = ANY($1)', [conversacionesCreadas]);
  }
  if (preguntasCreadas.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'pregunta_frecuente' AND entidad_id = ANY($1::text[])",
      [preguntasCreadas],
    );
    await consultar('DELETE FROM pregunta_frecuente WHERE id = ANY($1)', [preguntasCreadas]);
  }
  if (serviciosCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'servicio' AND entidad_id = ANY($1::text[])",
      [serviciosCreados],
    );
    await consultar('DELETE FROM servicio WHERE id = ANY($1)', [serviciosCreados]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE id = $1', [sedeAjena.id]);
  await cerrarPool();
  await cerrarRedis();
});

describe('GET /api/admin/servicios', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(app).get('/api/admin/servicios');
    expect(res.status).toBe(401);
  });

  it('devuelve los servicios sin paginar, ordenados y con sus preguntas frecuentes', async () => {
    const res = await request(app).get('/api/admin/servicios').set('Cookie', sesiones.marketing);

    expect(res.status).toBe(200);
    expect(res.body.paginacion).toBeUndefined();
    expect(res.body.datos.length).toBeGreaterThanOrEqual(6);
    expect(res.body.datos[0]).toEqual({
      id: expect.any(Number),
      sede: {
        id: expect.any(Number),
        nombre: expect.any(String),
        slug: SEDE_PRINCIPAL,
      },
      slug: 'bautismo',
      nombre: 'Bautismo',
      descripcionCorta: expect.any(String),
      icono: 'droplet',
      contenido: {
        datos: expect.any(Array),
      },
      orden: 1,
      visible: true,
      preguntasFrecuentes: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          pregunta: expect.any(String),
          respuesta: expect.any(String),
          orden: 0,
          activa: true,
        }),
      ]),
    });
  });

  it('respeta los filtros de sede y visible según el rol', async () => {
    const ajena = await request(app)
      .get(`/api/admin/servicios?sede=${sedeAjena.slug}`)
      .set('Cookie', sesiones.secretaria);
    expect(ajena.status).toBe(403);
    expect(ajena.body.error.codigo).toBe('SIN_PERMISO');

    const soloOcultos = await request(app)
      .get('/api/admin/servicios?visible=false')
      .set('Cookie', sesiones.secretaria);
    expect(soloOcultos.status).toBe(200);
    expect(soloOcultos.body.datos.every((s) => s.visible === false)).toBe(true);
  });
});

describe('GET /api/admin/servicios/:id', () => {
  it('responde 404 si no existe y 403 si es de otra sede', async () => {
    const creadoAjeno = await crearServicioApi('ajeno', {
      nombre: 'Servicio ajeno consulta',
      descripcionCorta: 'Descripción breve del servicio ajeno.',
      icono: 'heart',
      contenido: { datos: [] },
      visible: true,
    });
    expect(creadoAjeno.status).toBe(201);

    const noExiste = await request(app)
      .get('/api/admin/servicios/99999999')
      .set('Cookie', sesiones.admin);
    expect(noExiste.status).toBe(404);

    const otroRol = await request(app)
      .get(`/api/admin/servicios/${creadoAjeno.body.datos.id}`)
      .set('Cookie', sesiones.secretaria);
    expect(otroRol.status).toBe(403);
    expect(otroRol.body.error.codigo).toBe('SIN_PERMISO');
  });
});

describe('POST /api/admin/servicios', () => {
  it('prohíbe crear a Marketing (403 SIN_PERMISO)', async () => {
    const res = await crearServicioApi('marketing', {
      nombre: 'Servicio bloqueado',
      descripcionCorta: 'No debería crearse.',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('valida sedeId para Administrador, contenido y formato de ícono', async () => {
    const sinSede = await crearServicioApi('admin', {
      nombre: 'Servicio sin sede',
      descripcionCorta: 'Falta sedeId.',
    });
    expect(sinSede.status).toBe(400);
    expect(sinSede.body.error.detalles).toContainEqual(
      expect.objectContaining({ campo: 'sedeId' }),
    );

    const invalido = await crearServicioApi('secretaria', {
      nombre: 'Servicio inválido',
      descripcionCorta: 'Contenido con error.',
      icono: 'HeartIcon',
      contenido: {
        datos: [{ etiqueta: '', valor: 'Algo', extra: 'no permitido' }],
      },
    });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.codigo).toBe('VALIDACION');
    const campos = invalido.body.error.detalles.map((d) => d.campo);
    expect(campos).toContain('icono');
    expect(campos.some((c) => c.startsWith('contenido.datos.0'))).toBe(true);
  });

  it('crea servicio con slug generado, registra en bitácora y detecta slug repetido en la sede', async () => {
    const res = await crearServicioApi('secretaria', {
      sedeId: sedeAjena.id, // Secretaría debe ignorar sedeId ajeno y crear en su propia sede.
      nombre: 'Unción y Oración Extra',
      slug: null,
      descripcionCorta: 'Servicio creado en prueba de integración.',
      icono: 'heart-handshake',
      contenido: {
        datos: [{ etiqueta: 'Requisitos', valor: 'Coordinación previa en secretaría' }],
      },
      visible: true,
    });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/admin/servicios/${res.body.datos.id}`);
    expect(res.body.datos).toMatchObject({
      sede: { slug: SEDE_PRINCIPAL },
      slug: 'uncion-y-oracion-extra',
      nombre: 'Unción y Oración Extra',
      icono: 'heart-handshake',
      orden: expect.any(Number),
      visible: true,
      preguntasFrecuentes: [],
    });

    const duplicado = await crearServicioApi('parroco', {
      nombre: 'Otro con mismo slug',
      slug: 'uncion-y-oracion-extra',
      descripcionCorta: 'Mismo slug en la misma sede.',
    });
    expect(duplicado.status).toBe(409);
    expect(duplicado.body.error.codigo).toBe('CONFLICTO');

    const enOtraSede = await crearServicioApi('admin', {
      sedeId: sedeAjena.id,
      nombre: 'Unción y Oración Extra',
      descripcionCorta: 'Mismo slug permitido en sede distinta.',
    });
    expect(enOtraSede.status).toBe(201);

    const { rows: bitacora } = await consultar(
      "SELECT accion, entidad_id FROM bitacora_cambio WHERE entidad = 'servicio' AND entidad_id = $1",
      [String(res.body.datos.id)],
    );
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0].accion).toBe('INSERT');
  });
});

describe('PATCH /api/admin/servicios/:id y POST /api/admin/servicios/reordenar', () => {
  it('edita parcialmente, valida slug duplicado y reordena los servicios de una sede', async () => {
    const s1 = await crearServicioApi('ajeno', {
      nombre: 'Servicio Orden Uno',
      descripcionCorta: 'Primero en sede ajena.',
    });
    const s2 = await crearServicioApi('ajeno', {
      nombre: 'Servicio Orden Dos',
      descripcionCorta: 'Segundo en sede ajena.',
    });
    expect(s1.status).toBe(201);
    expect(s2.status).toBe(201);

    const editado = await request(app)
      .patch(`/api/admin/servicios/${s1.body.datos.id}`)
      .set('Cookie', sesiones.ajeno)
      .send({ nombre: 'Servicio Renombrado', slug: null, visible: false });
    expect(editado.status).toBe(200);
    expect(editado.body.datos.slug).toBe('servicio-renombrado');
    expect(editado.body.datos.visible).toBe(false);

    const choque = await request(app)
      .patch(`/api/admin/servicios/${s2.body.datos.id}`)
      .set('Cookie', sesiones.ajeno)
      .send({ slug: 'servicio-renombrado' });
    expect(choque.status).toBe(409);

    const listaAjena = await request(app)
      .get(`/api/admin/servicios?sede=${sedeAjena.slug}`)
      .set('Cookie', sesiones.admin);
    const idsActuales = listaAjena.body.datos.map((s) => s.id);
    const idsInvertidos = [...idsActuales].reverse();

    const incompleto = await request(app)
      .post('/api/admin/servicios/reordenar')
      .set('Cookie', sesiones.ajeno)
      .send({ ids: idsInvertidos.slice(0, 1) });
    expect(incompleto.status).toBe(400);

    const cruceSede = await request(app)
      .post('/api/admin/servicios/reordenar')
      .set('Cookie', sesiones.secretaria)
      .send({ ids: idsInvertidos });
    expect(cruceSede.status).toBe(403);

    const reordenado = await request(app)
      .post('/api/admin/servicios/reordenar')
      .set('Cookie', sesiones.admin)
      .send({ ids: idsInvertidos });
    expect(reordenado.status).toBe(200);
    expect(reordenado.body.datos.map((s) => s.id)).toEqual(idsInvertidos);
    expect(reordenado.body.datos.map((s) => s.orden)).toEqual(
      idsInvertidos.map((_, indice) => indice + 1),
    );
  });
});

describe('Preguntas frecuentes y desvinculación al eliminar servicio', () => {
  it('gestiona preguntas frecuentes (crear, editar, reordenar, eliminar y conflicto 409) y las conserva sin servicio al borrarlo', async () => {
    const srv = await crearServicioApi('ajeno', {
      nombre: 'Servicio con Preguntas',
      descripcionCorta: 'Para probar preguntas frecuentes.',
    });
    expect(srv.status).toBe(201);
    const servicioId = srv.body.datos.id;

    const p1 = await crearPreguntaApi('ajeno', servicioId, {
      pregunta: '¿Cuál es el horario de inscripción?',
      respuesta: 'De lunes a viernes de 9:00 a 12:00.',
    });
    const p2 = await crearPreguntaApi('ajeno', servicioId, {
      pregunta: '¿Qué documentos se piden?',
      respuesta: 'Cédula de identidad vigente.',
      activa: false,
    });
    expect(p1.status).toBe(201);
    expect(p1.headers.location).toBe(
      `/api/admin/servicios/${servicioId}/preguntas-frecuentes/${p1.body.datos.id}`,
    );
    expect(p1.body.datos.orden).toBe(0);
    expect(p2.status).toBe(201);
    expect(p2.body.datos.orden).toBe(1);
    expect(p2.body.datos.activa).toBe(false);

    const detalle = await request(app)
      .get(`/api/admin/servicios/${servicioId}`)
      .set('Cookie', sesiones.ajeno);
    expect(detalle.status).toBe(200);
    expect(detalle.body.datos.preguntasFrecuentes).toHaveLength(2);

    const editada = await request(app)
      .patch(`/api/admin/servicios/${servicioId}/preguntas-frecuentes/${p2.body.datos.id}`)
      .set('Cookie', sesiones.ajeno)
      .send({ activa: true, respuesta: 'Cédula de identidad y certificado.' });
    expect(editada.status).toBe(200);
    expect(editada.body.datos.activa).toBe(true);

    const reorden = await request(app)
      .post(`/api/admin/servicios/${servicioId}/preguntas-frecuentes/reordenar`)
      .set('Cookie', sesiones.ajeno)
      .send({ ids: [p2.body.datos.id, p1.body.datos.id] });
    expect(reorden.status).toBe(200);
    expect(reorden.body.datos.map((p) => p.id)).toEqual([p2.body.datos.id, p1.body.datos.id]);
    expect(reorden.body.datos.map((p) => p.orden)).toEqual([0, 1]);

    // Si una pregunta tiene referencia en mensaje_bot, DELETE responde 409 CONFLICTO.
    const { rows: convRows } = await consultar(
      `INSERT INTO conversacion_bot (sede_id, canal, identificador_contacto)
       VALUES ($1, 'WEB', 'test-contacto') RETURNING id`,
      [sedeAjena.id],
    );
    conversacionesCreadas.push(convRows[0].id);
    await consultar(
      `INSERT INTO mensaje_bot (conversacion_id, emisor, contenido, pregunta_frecuente_id)
       VALUES ($1, 'BOT', 'Respuesta automática', $2)`,
      [convRows[0].id, p1.body.datos.id],
    );

    const conflictoBorrar = await request(app)
      .delete(`/api/admin/servicios/${servicioId}/preguntas-frecuentes/${p1.body.datos.id}`)
      .set('Cookie', sesiones.ajeno);
    expect(conflictoBorrar.status).toBe(409);
    expect(conflictoBorrar.body.error.codigo).toBe('CONFLICTO');

    const borradaP2 = await request(app)
      .delete(`/api/admin/servicios/${servicioId}/preguntas-frecuentes/${p2.body.datos.id}`)
      .set('Cookie', sesiones.ajeno);
    expect(borradaP2.status).toBe(204);

    // Al borrar el servicio, p1 permanece en la tabla con servicio_id = NULL para el bot.
    const borradoSrv = await request(app)
      .delete(`/api/admin/servicios/${servicioId}`)
      .set('Cookie', sesiones.ajeno);
    expect(borradoSrv.status).toBe(204);

    const { rows: p1EnDb } = await consultar(
      'SELECT id, servicio_id, pregunta FROM pregunta_frecuente WHERE id = $1',
      [p1.body.datos.id],
    );
    expect(p1EnDb).toHaveLength(1);
    expect(p1EnDb[0].servicio_id).toBeNull();
  });
});
