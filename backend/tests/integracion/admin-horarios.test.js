// Gestión de horarios en el panel CMS (/api/admin/horarios) contra PostgreSQL real.
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
const horariosCreados = [];
let sedeAjena;
let tiposHorario;

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function crearHorarioApi(quien, cuerpo) {
  const res = await request(app)
    .post('/api/admin/horarios')
    .set('Cookie', sesiones[quien])
    .send(cuerpo);
  if (res.status === 201) horariosCreados.push(res.body.datos.id);
  return res;
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows: sedesRows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede horarios', $1)
     RETURNING id, slug, nombre`,
    [`prueba-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = sedesRows[0];

  const { rows: tiposRows } = await consultar('SELECT id, nombre FROM tipo_horario ORDER BY id');
  tiposHorario = tiposRows;

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
  if (horariosCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'horario' AND entidad_id = ANY($1::text[])",
      [horariosCreados],
    );
    await consultar('DELETE FROM horario WHERE id = ANY($1)', [horariosCreados]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE id = $1', [sedeAjena.id]);
  await cerrarPool();
  await cerrarRedis();
});

describe('GET /api/admin/horarios', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(app).get('/api/admin/horarios');
    expect(res.status).toBe(401);
  });

  it('devuelve la lista sin paginar con el formato del contrato y ordenada', async () => {
    const res = await request(app).get('/api/admin/horarios').set('Cookie', sesiones.marketing);

    expect(res.status).toBe(200);
    expect(res.body.paginacion).toBeUndefined();
    expect(res.body.datos.length).toBeGreaterThanOrEqual(34);
    expect(res.body.datos[0]).toEqual({
      id: expect.any(Number),
      sede: {
        id: 1,
        nombre: 'Parroquia Señor de la Exaltación',
        slug: SEDE_PRINCIPAL,
      },
      tipo: { id: expect.any(Number), nombre: expect.any(String) },
      diaSemana: expect.any(Number),
      horaInicio: expect.stringMatching(/^\d{2}:\d{2}$/),
      horaFin: null,
      descripcion: null,
      activo: true,
    });

    // Verifica el orden: tipo.id ASC, diaSemana ASC, horaInicio ASC.
    for (let i = 1; i < res.body.datos.length; i += 1) {
      const ant = res.body.datos[i - 1];
      const act = res.body.datos[i];
      const cmpTipo = ant.tipo.id - act.tipo.id;
      const cmpDia = ant.diaSemana - act.diaSemana;
      if (cmpTipo !== 0) expect(cmpTipo).toBeLessThan(0);
      else if (cmpDia !== 0) expect(cmpDia).toBeLessThan(0);
      else expect(ant.horaInicio <= act.horaInicio).toBe(true);
    }
  });

  it('un usuario de sede no puede consultar otra sede (403); el Administrador filtra por sede', async () => {
    const creadoAjeno = await crearHorarioApi('ajeno', {
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 2,
      horaInicio: '08:30',
    });
    expect(creadoAjeno.status).toBe(201);

    const prohibido = await request(app)
      .get(`/api/admin/horarios?sede=${sedeAjena.slug}`)
      .set('Cookie', sesiones.secretaria);
    expect(prohibido.status).toBe(403);
    expect(prohibido.body.error.codigo).toBe('SIN_PERMISO');

    const admin = await request(app)
      .get(`/api/admin/horarios?sede=${sedeAjena.slug}`)
      .set('Cookie', sesiones.admin);
    expect(admin.status).toBe(200);
    expect(admin.body.datos.map((h) => h.id)).toContain(creadoAjeno.body.datos.id);
    expect(admin.body.datos.every((h) => h.sede.slug === sedeAjena.slug)).toBe(true);
  });

  it('filtra por tipo (varios ids) y activo, e ignora parámetros desconocidos', async () => {
    const inactivo = await crearHorarioApi('secretaria', {
      tipoHorarioId: tiposHorario[2].id,
      diaSemana: 5,
      horaInicio: '20:00',
      activo: false,
    });
    expect(inactivo.status).toBe(201);

    const porTipo = await request(app)
      .get(`/api/admin/horarios?tipo=${tiposHorario[1].id},${tiposHorario[2].id}&desconocido=1`)
      .set('Cookie', sesiones.secretaria);
    expect(porTipo.status).toBe(200);
    expect(
      porTipo.body.datos.every((h) => [tiposHorario[1].id, tiposHorario[2].id].includes(h.tipo.id)),
    ).toBe(true);

    const soloInactivos = await request(app)
      .get('/api/admin/horarios?activo=false')
      .set('Cookie', sesiones.secretaria);
    expect(soloInactivos.status).toBe(200);
    expect(soloInactivos.body.datos.map((h) => h.id)).toContain(inactivo.body.datos.id);
    expect(soloInactivos.body.datos.every((h) => h.activo === false)).toBe(true);
  });

  it('responde 400 si los filtros tienen formato inválido', async () => {
    const res = await request(app)
      .get('/api/admin/horarios?tipo=1,abc&activo=si')
      .set('Cookie', sesiones.secretaria);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });
});

describe('GET /api/admin/horarios/:id', () => {
  it('devuelve el horario por id, 404 si no existe y 403 si es de otra sede', async () => {
    const creado = await crearHorarioApi('ajeno', {
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 3,
      horaInicio: '09:00',
    });
    const idAjeno = creado.body.datos.id;

    const propio = await request(app)
      .get(`/api/admin/horarios/${idAjeno}`)
      .set('Cookie', sesiones.ajeno);
    expect(propio.status).toBe(200);
    expect(propio.body.datos.id).toBe(idAjeno);

    const denegado = await request(app)
      .get(`/api/admin/horarios/${idAjeno}`)
      .set('Cookie', sesiones.secretaria);
    expect(denegado.status).toBe(403);

    const admin = await request(app)
      .get(`/api/admin/horarios/${idAjeno}`)
      .set('Cookie', sesiones.admin);
    expect(admin.status).toBe(200);

    const noExiste = await request(app)
      .get('/api/admin/horarios/2000000000')
      .set('Cookie', sesiones.admin);
    expect(noExiste.status).toBe(404);
  });
});

describe('POST /api/admin/horarios', () => {
  it('crea con Secretaría, Párroco y Administrador; Marketing recibe 403', async () => {
    const marketing = await crearHorarioApi('marketing', {
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 1,
      horaInicio: '06:30',
    });
    expect(marketing.status).toBe(403);

    const secretaria = await crearHorarioApi('secretaria', {
      sedeId: sedeAjena.id, // debe ignorarse para roles de sede
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 6,
      horaInicio: '17:00',
      horaFin: '18:00',
      descripcion: '  Misa especial  ',
      activo: true,
    });
    expect(secretaria.status).toBe(201);
    expect(secretaria.headers.location).toBe(`/api/admin/horarios/${secretaria.body.datos.id}`);
    expect(secretaria.body.datos).toMatchObject({
      sede: { slug: SEDE_PRINCIPAL },
      tipo: { id: tiposHorario[0].id },
      diaSemana: 6,
      horaInicio: '17:00',
      horaFin: '18:00',
      descripcion: 'Misa especial',
      activo: true,
    });

    const parroco = await crearHorarioApi('parroco', {
      tipoHorarioId: tiposHorario[1].id,
      diaSemana: 2,
      horaInicio: '16:00',
    });
    expect(parroco.status).toBe(201);

    // Registra en bitácora dentro de la transacción.
    const { rows: bitacora } = await consultar(
      "SELECT usuario_id, accion, datos_anteriores, datos_nuevos FROM bitacora_cambio WHERE entidad = 'horario' AND entidad_id = $1",
      [String(secretaria.body.datos.id)],
    );
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0]).toMatchObject({
      usuario_id: usuarios.secretaria.id,
      accion: 'INSERT',
      datos_anteriores: null,
    });
    expect(bitacora[0].datos_nuevos.descripcion).toBe('Misa especial');
  });

  it('el Administrador sin sede debe indicar sedeId y puede elegir cualquier sede', async () => {
    const sinSede = await crearHorarioApi('admin', {
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 1,
      horaInicio: '08:00',
    });
    expect(sinSede.status).toBe(400);
    expect(sinSede.body.error.detalles).toEqual([
      { campo: 'sedeId', mensaje: 'Indica la sede del horario.' },
    ]);

    const conSede = await crearHorarioApi('admin', {
      sedeId: sedeAjena.id,
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 1,
      horaInicio: '08:00',
    });
    expect(conSede.status).toBe(201);
    expect(conSede.body.datos.sede.id).toBe(sedeAjena.id);
  });

  it('valida rangos, horas, longitudes, referencias y rechaza campos extra', async () => {
    const invalido = await crearHorarioApi('secretaria', {
      tipoHorarioId: 999999,
      diaSemana: 8,
      horaInicio: '18:00',
      horaFin: '17:00',
      descripcion: 'a'.repeat(151),
      extra: true,
    });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.codigo).toBe('VALIDACION');

    const tipoInexistente = await crearHorarioApi('secretaria', {
      tipoHorarioId: 999999,
      diaSemana: 5,
      horaInicio: '18:00',
    });
    expect(tipoInexistente.status).toBe(400);
    expect(tipoInexistente.body.error.detalles[0].campo).toBe('tipoHorarioId');

    const sedeInexistente = await crearHorarioApi('admin', {
      sedeId: 999999,
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 5,
      horaInicio: '18:00',
    });
    expect(sedeInexistente.status).toBe(400);
    expect(sedeInexistente.body.error.detalles[0].campo).toBe('sedeId');
  });
});

describe('PATCH /api/admin/horarios/:id', () => {
  it('edita parcialmente, valida horaFin contra horaInicio existente y registra en bitácora', async () => {
    const creado = await crearHorarioApi('secretaria', {
      tipoHorarioId: tiposHorario[1].id,
      diaSemana: 4,
      horaInicio: '15:00',
      horaFin: '16:00',
      descripcion: 'Confesiones tarde',
    });
    const id = creado.body.datos.id;

    // Cambiar solo horaInicio a una hora posterior a horaFin existente debe fallar.
    const horaInvalida = await request(app)
      .patch(`/api/admin/horarios/${id}`)
      .set('Cookie', sesiones.secretaria)
      .send({ horaInicio: '17:00' });
    expect(horaInvalida.status).toBe(400);
    expect(horaInvalida.body.error.detalles[0].campo).toBe('horaFin');

    const editado = await request(app)
      .patch(`/api/admin/horarios/${id}`)
      .set('Cookie', sesiones.secretaria)
      .send({ activo: false, horaFin: null, descripcion: null });
    expect(editado.status).toBe(200);
    expect(editado.body.datos).toMatchObject({
      id,
      horaInicio: '15:00',
      horaFin: null,
      descripcion: null,
      activo: false,
    });

    const { rows: bitacora } = await consultar(
      "SELECT accion, datos_anteriores, datos_nuevos FROM bitacora_cambio WHERE entidad = 'horario' AND entidad_id = $1 ORDER BY id",
      [String(id)],
    );
    expect(bitacora).toHaveLength(2);
    expect(bitacora[1].accion).toBe('UPDATE');
    expect(bitacora[1].datos_anteriores).toEqual({
      hora_fin: '16:00:00',
      descripcion: 'Confesiones tarde',
      activo: true,
    });
    expect(bitacora[1].datos_nuevos).toEqual({
      hora_fin: null,
      descripcion: null,
      activo: false,
    });
  });

  it('respeta permisos (403) y sede (403), y responde 404 si no existe', async () => {
    const creado = await crearHorarioApi('ajeno', {
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 1,
      horaInicio: '07:00',
    });
    const id = creado.body.datos.id;

    expect(
      (
        await request(app)
          .patch(`/api/admin/horarios/${id}`)
          .set('Cookie', sesiones.marketing)
          .send({ activo: false })
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .patch(`/api/admin/horarios/${id}`)
          .set('Cookie', sesiones.secretaria)
          .send({ activo: false })
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .patch('/api/admin/horarios/2000000000')
          .set('Cookie', sesiones.admin)
          .send({ activo: false })
      ).status,
    ).toBe(404);
  });
});

describe('DELETE /api/admin/horarios/:id', () => {
  it('elimina un horario y registra DELETE en la bitácora', async () => {
    const creado = await crearHorarioApi('secretaria', {
      tipoHorarioId: tiposHorario[0].id,
      diaSemana: 7,
      horaInicio: '20:00',
    });
    const id = creado.body.datos.id;

    expect(
      (await request(app).delete(`/api/admin/horarios/${id}`).set('Cookie', sesiones.marketing))
        .status,
    ).toBe(403);

    expect(
      (await request(app).delete(`/api/admin/horarios/${id}`).set('Cookie', sesiones.ajeno)).status,
    ).toBe(403);

    const borrado = await request(app)
      .delete(`/api/admin/horarios/${id}`)
      .set('Cookie', sesiones.secretaria);
    expect(borrado.status).toBe(204);
    expect(borrado.body).toEqual({});

    const { rows: bitacora } = await consultar(
      "SELECT accion, datos_anteriores, datos_nuevos FROM bitacora_cambio WHERE entidad = 'horario' AND entidad_id = $1 ORDER BY id DESC LIMIT 1",
      [String(id)],
    );
    expect(bitacora[0].accion).toBe('DELETE');
    expect(bitacora[0].datos_nuevos).toBeNull();
    expect(bitacora[0].datos_anteriores.id).toBe(id);

    const consulta = await request(app)
      .get(`/api/admin/horarios/${id}`)
      .set('Cookie', sesiones.secretaria);
    expect(consulta.status).toBe(404);
  });
});
