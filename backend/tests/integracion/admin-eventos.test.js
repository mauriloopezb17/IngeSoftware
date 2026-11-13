// Gestión de eventos del calendario (/api/admin/eventos) contra la aplicación real y PostgreSQL.
// Cada prueba crea sus propios eventos (título con prefijo) y al final se borran.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { archivoDelSeed, crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const RUTA = '/api/admin/eventos';
const PREFIJO = `Prueba evento ${Date.now()}`;
let contador = 0;
let sede;
let sedeAjena;
let altar;
let pdf;
let imagenAjena;

const evento = (extra = {}) => ({
  titulo: `${PREFIJO} ${++contador}`,
  fechaInicio: '2031-11-22T10:00:00-04:00',
  categoriaEventoId: 2,
  ...extra,
});

async function crear(quien, extra) {
  const respuesta = await como(quien).post(RUTA, evento(extra));
  expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
  return respuesta.body.datos;
}

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  altar = await archivoDelSeed('/media/seed/altar.webp');

  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('secretariaAjena', { rol: 'SECRETARIA', sede: sedeAjena.slug });

  pdf = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'application/pdf',
  });
  imagenAjena = await panel.crearArchivo({
    sedeId: sedeAjena.id,
    subidoPor: usuarios.secretariaAjena.id,
    tipoMime: 'image/webp',
  });
});

afterAll(async () => {
  await panel.limpiar(() => consultar('DELETE FROM evento WHERE titulo LIKE $1', [`${PREFIJO}%`]));
  await cerrarPool();
  await cerrarRedis();
});

describe('permisos', () => {
  it('sin sesión 401; Marketing puede leer pero no escribir (403)', async () => {
    expect((await como().get(RUTA)).status).toBe(401);
    expect((await como('marketing').get(RUTA)).status).toBe(200);

    const propio = await crear('secretaria');
    expect((await como('marketing').post(RUTA, evento())).status).toBe(403);
    expect((await como('marketing').patch(`${RUTA}/${propio.id}`, { lugar: 'x' })).status).toBe(
      403,
    );
    expect((await como('marketing').delete(`${RUTA}/${propio.id}`)).status).toBe(403);
  });

  it('Administrador, Párroco y Secretaría pueden crear', async () => {
    for (const quien of ['admin', 'parroco', 'secretaria']) {
      const cuerpo = evento(quien === 'admin' ? { sedeId: sede.id } : {});
      expect((await como(quien).post(RUTA, cuerpo)).status).toBe(201);
    }
  });
});

describe('POST /api/admin/eventos', () => {
  it('crea un evento con el objeto del contrato, Location y bitácora', async () => {
    const respuesta = await como('secretaria').post(
      RUTA,
      evento({
        descripcion: 'Santa Misa solemne.',
        lugar: 'Templo parroquial',
        fechaFin: '2031-11-22T12:00:00-04:00',
        imagenId: altar.id,
      }),
    );

    expect(respuesta.status).toBe(201);
    const datos = respuesta.body.datos;
    expect(respuesta.headers.location).toBe(`/api/admin/eventos/${datos.id}`);
    expect(Object.keys(datos)).toEqual(
      Object.keys(ejemploDelContrato('## 4. Eventos', 0, 'admin.md')),
    );
    expect(datos).toMatchObject({
      sede: { id: sede.id, slug: sede.slug },
      estado: { codigo: 'PUBLICADO', nombre: 'Publicado' },
      descripcion: 'Santa Misa solemne.',
      lugar: 'Templo parroquial',
      fechaInicio: '2031-11-22T10:00:00-04:00',
      fechaFin: '2031-11-22T12:00:00-04:00',
      todoElDia: false,
      categoria: { id: 2, nombre: expect.any(String), colorHex: expect.any(String) },
      imagen: { id: altar.id, url: '/media/seed/altar.webp' },
      idExternoM365: null,
      creadoPor: { id: usuarios.secretaria.id, nombreCompleto: expect.any(String) },
      finalizado: false,
    });

    const [registro] = await registrosDe('evento', datos.id);
    expect(registro).toMatchObject({
      usuario_id: usuarios.secretaria.id,
      accion: 'INSERT',
      datos_anteriores: null,
      datos_nuevos: { id: datos.id, sede_id: sede.id, titulo: datos.titulo },
    });
  });

  it('acepta otra zona horaria y la responde en hora de Bolivia', async () => {
    const creado = await crear('secretaria', { fechaInicio: '2031-11-22T14:00:00Z' });
    expect(creado.fechaInicio).toBe('2031-11-22T10:00:00-04:00');
  });

  it('el estado por defecto es PUBLICADO; acepta BORRADOR y ARCHIVADO, no EN_REVISION', async () => {
    expect((await crear('secretaria', { estado: 'BORRADOR' })).estado.codigo).toBe('BORRADOR');
    expect((await crear('secretaria', { estado: 'ARCHIVADO' })).estado.codigo).toBe('ARCHIVADO');

    const revision = await como('secretaria').post(RUTA, evento({ estado: 'EN_REVISION' }));
    expect(revision.status).toBe(400);
    expect(revision.body.error.detalles[0].campo).toBe('estado');
  });

  it('valida el cuerpo con un detalle por campo', async () => {
    const respuesta = await como('secretaria').post(RUTA, {
      titulo: 'ab',
      descripcion: 'x'.repeat(2001),
      lugar: 'x'.repeat(151),
      fechaInicio: '2031-11-22T10:00:00',
      fechaFin: 'ayer',
      todoElDia: 'no',
      imagenId: 'x',
      idExternoM365: 'abc',
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual(
      [
        'categoriaEventoId',
        'descripcion',
        'fechaFin',
        'fechaInicio',
        'idExternoM365',
        'imagenId',
        'lugar',
        'titulo',
        'todoElDia',
      ].sort(),
    );
  });

  it('el fin no puede ser anterior al inicio; igual es válido', async () => {
    const anterior = await como('secretaria').post(
      RUTA,
      evento({ fechaFin: '2031-11-22T09:59:00-04:00' }),
    );
    expect(anterior.status).toBe(400);
    expect(anterior.body.error.detalles).toEqual([
      { campo: 'fechaFin', mensaje: 'Debe ser igual o posterior a la fecha de inicio.' },
    ]);
    expect(
      (await como('secretaria').post(RUTA, evento({ fechaFin: '2031-11-22T10:00:00-04:00' })))
        .status,
    ).toBe(201);
  });

  it('categoría inexistente o imagen que no es una imagen de la sede es 400 en su campo', async () => {
    const respuesta = await como('secretaria').post(
      RUTA,
      evento({ categoriaEventoId: 999999, imagenId: pdf.id }),
    );
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'categoriaEventoId', mensaje: 'La categoría no existe.' },
      { campo: 'imagenId', mensaje: 'El archivo no es una imagen.' },
    ]);

    const ajena = await como('secretaria').post(RUTA, evento({ imagenId: imagenAjena.id }));
    expect(ajena.status).toBe(400);
    expect(ajena.body.error.detalles[0].campo).toBe('imagenId');
  });

  it('sede: el Administrador sin sede indica sedeId; los demás usan la suya', async () => {
    expect((await como('admin').post(RUTA, evento())).body.error.detalles).toEqual([
      { campo: 'sedeId', mensaje: 'Indica la sede.' },
    ]);
    const enAjena = await crear('admin', { sedeId: sedeAjena.id });
    expect(enAjena.sede.id).toBe(sedeAjena.id);
    expect((await crear('secretaria', { sedeId: sedeAjena.id })).sede.id).toBe(sede.id);
  });
});

describe('GET /api/admin/eventos', () => {
  let futuro;
  let finalizado;
  let sinFinHoy;
  let borrador;
  let ajeno;
  const buscar = (extra = '') => `${RUTA}?pagina=1&porPagina=50${extra}`;
  const propios = (respuesta) =>
    respuesta.body.datos.filter((e) => e.titulo.startsWith(`${PREFIJO} lista`)).map((e) => e.id);

  beforeAll(async () => {
    futuro = await crear('secretaria', {
      titulo: `${PREFIJO} lista 1`,
      fechaInicio: '2031-03-10T10:00:00-04:00',
      categoriaEventoId: 1,
    });
    finalizado = await crear('secretaria', {
      titulo: `${PREFIJO} lista 2`,
      fechaInicio: '2020-03-10T10:00:00-04:00',
      fechaFin: '2020-03-10T12:00:00-04:00',
      categoriaEventoId: 3,
    });
    sinFinHoy = await crear('secretaria', {
      titulo: `${PREFIJO} lista 3`,
      fechaInicio: '2020-03-12T23:00:00-04:00',
    });
    borrador = await crear('secretaria', {
      titulo: `${PREFIJO} lista 4`,
      fechaInicio: '2031-03-11T10:00:00-04:00',
      estado: 'BORRADOR',
    });
    ajeno = await crear('secretariaAjena', {
      titulo: `${PREFIJO} lista 5`,
      fechaInicio: '2031-03-12T10:00:00-04:00',
    });
  });

  it('pagina, ordena por fechaInicio y ve todos los estados y los finalizados', async () => {
    const asc = await como('parroco').get(buscar());
    expect(asc.status).toBe(200);
    expect(propios(asc)).toEqual(expect.arrayContaining([futuro.id, finalizado.id, borrador.id]));
    expect(propios(asc)).not.toContain(ajeno.id);
    const fechas = asc.body.datos.map((e) => e.fechaInicio);
    expect(fechas).toEqual([...fechas].sort());

    const desc = await como('parroco').get(buscar('&orden=-fechaInicio'));
    expect(desc.body.datos.map((e) => e.fechaInicio)).toEqual([...fechas].reverse());

    const pagina = await como('parroco').get(`${RUTA}?porPagina=2&pagina=2`);
    expect(pagina.body.paginacion).toMatchObject({ pagina: 2, porPagina: 2 });
  });

  it('finalizados: true/false según la regla del portal (con o sin fecha de fin)', async () => {
    const si = await como('parroco').get(buscar('&finalizados=true'));
    expect(propios(si)).toEqual(expect.arrayContaining([finalizado.id, sinFinHoy.id]));
    expect(propios(si)).not.toContain(futuro.id);
    expect(si.body.datos.every((e) => e.finalizado)).toBe(true);

    const no = await como('parroco').get(buscar('&finalizados=false'));
    expect(propios(no)).toEqual(expect.arrayContaining([futuro.id, borrador.id]));
    expect(no.body.datos.every((e) => !e.finalizado)).toBe(true);
  });

  it('filtra por estado, categoría y rango de fechas', async () => {
    const borradores = await como('parroco').get(buscar('&estado=BORRADOR'));
    expect(propios(borradores)).toEqual([borrador.id]);

    const categoria = await como('parroco').get(buscar('&categoria=3,4'));
    expect(propios(categoria)).toEqual([finalizado.id]);

    const rango = await como('parroco').get(buscar('&desde=2031-03-10&hasta=2031-03-10'));
    expect(propios(rango)).toEqual([futuro.id]);
  });

  it('valida los parámetros; cada rol ve su sede y el Administrador filtra por sede', async () => {
    const invalido = await como('parroco').get(
      `${RUTA}?estado=EN_REVISION&finalizados=quizas&orden=titulo`,
    );
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.detalles.map((d) => d.campo).sort()).toEqual([
      'query.estado.0',
      'query.finalizados',
      'query.orden',
    ]);
    const rango = await como('parroco').get(`${RUTA}?desde=2031-03-10&hasta=2031-03-01`);
    expect(rango.body.error.detalles).toEqual([
      { campo: 'query.hasta', mensaje: 'Debe ser igual o posterior a desde.' },
    ]);

    expect(propios(await como('secretariaAjena').get(buscar()))).toEqual([ajeno.id]);
    expect((await como('secretaria').get(`${RUTA}?sede=${sedeAjena.slug}`)).status).toBe(403);
    expect(propios(await como('admin').get(buscar(`&sede=${sedeAjena.slug}`)))).toEqual([ajeno.id]);
  });

  it('el detalle: 404 si no existe, 403 si es de otra sede, 400 si el id no es un número', async () => {
    expect((await como('secretaria').get(`${RUTA}/${futuro.id}`)).body.datos.id).toBe(futuro.id);
    expect((await como('secretaria').get(`${RUTA}/999999999`)).status).toBe(404);
    expect((await como('secretaria').get(`${RUTA}/${ajeno.id}`)).status).toBe(403);
    expect((await como('secretaria').get(`${RUTA}/abc`)).status).toBe(400);
  });
});

describe('PATCH /api/admin/eventos/:id', () => {
  it('cambia solo lo enviado (incluido el estado) y null borra un campo opcional', async () => {
    const creado = await crear('secretaria', {
      descripcion: 'Descripción',
      lugar: 'Salón',
      fechaFin: '2031-11-22T12:00:00-04:00',
    });

    const respuesta = await como('parroco').patch(`${RUTA}/${creado.id}`, {
      titulo: `${PREFIJO} editado`,
      lugar: null,
      fechaFin: null,
      estado: 'ARCHIVADO',
      todoElDia: true,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toMatchObject({
      titulo: `${PREFIJO} editado`,
      descripcion: 'Descripción',
      lugar: null,
      fechaFin: null,
      todoElDia: true,
      estado: { codigo: 'ARCHIVADO' },
      fechaInicio: creado.fechaInicio,
    });

    const registros = await registrosDe('evento', creado.id);
    expect(registros.at(-1)).toMatchObject({
      usuario_id: usuarios.parroco.id,
      accion: 'UPDATE',
      datos_anteriores: { titulo: creado.titulo, lugar: 'Salón' },
      datos_nuevos: {
        titulo: `${PREFIJO} editado`,
        lugar: null,
        fecha_fin: null,
        todo_el_dia: true,
      },
    });
  });

  it('el fin se compara con el inicio guardado; las referencias se validan', async () => {
    const creado = await crear('secretaria');
    const fin = await como('secretaria').patch(`${RUTA}/${creado.id}`, {
      fechaFin: '2031-11-21T10:00:00-04:00',
    });
    expect(fin.status).toBe(400);
    expect(fin.body.error.detalles[0].campo).toBe('fechaFin');

    const inicio = await como('secretaria').patch(`${RUTA}/${creado.id}`, {
      fechaInicio: '2031-11-23T10:00:00-04:00',
      fechaFin: '2031-11-23T09:00:00-04:00',
    });
    expect(inicio.status).toBe(400);

    const referencias = await como('secretaria').patch(`${RUTA}/${creado.id}`, {
      categoriaEventoId: 999999,
      imagenId: imagenAjena.id,
    });
    expect(referencias.body.error.detalles.map((d) => d.campo)).toEqual([
      'categoriaEventoId',
      'imagenId',
    ]);
  });

  it('no acepta campos desconocidos ni idExternoM365; 404 y 403 por sede', async () => {
    const creado = await crear('secretaria');
    const ajeno = await crear('secretariaAjena');

    const campos = await como('secretaria').patch(`${RUTA}/${creado.id}`, {
      idExternoM365: 'x',
      sedeId: 1,
      estado: 'EN_REVISION',
    });
    expect(campos.status).toBe(400);
    expect(campos.body.error.detalles.map((d) => d.campo).sort()).toEqual([
      'estado',
      'idExternoM365',
      'sedeId',
    ]);

    expect((await como('secretaria').patch(`${RUTA}/999999999`, { lugar: 'x' })).status).toBe(404);
    expect((await como('secretaria').patch(`${RUTA}/${ajeno.id}`, { lugar: 'x' })).status).toBe(
      403,
    );
  });
});

describe('DELETE /api/admin/eventos/:id', () => {
  it('elimina (204), registra el DELETE y después el evento no existe', async () => {
    const creado = await crear('secretaria');
    const respuesta = await como('secretaria').delete(`${RUTA}/${creado.id}`);

    expect(respuesta.status).toBe(204);
    expect((await como('secretaria').get(`${RUTA}/${creado.id}`)).status).toBe(404);
    expect((await registrosDe('evento', creado.id)).at(-1)).toMatchObject({
      accion: 'DELETE',
      datos_anteriores: { id: creado.id, titulo: creado.titulo },
      datos_nuevos: null,
    });
  });

  it('404 si no existe y 403 si es de otra sede', async () => {
    const ajeno = await crear('secretariaAjena');
    expect((await como('secretaria').delete(`${RUTA}/999999999`)).status).toBe(404);
    expect((await como('secretaria').delete(`${RUTA}/${ajeno.id}`)).status).toBe(403);
  });
});
