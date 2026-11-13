// Gestión de proclamas (/api/admin/proclamas) y boletines (/api/admin/boletines) contra la
// aplicación real y PostgreSQL. Los datos de prueba llevan un prefijo y se borran al final; los
// del seed no se tocan.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const PREFIJO = `Prueba pb ${Date.now()}`;
let contador = 0;
let sede;
let sedeAjena;

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('secretariaAjena', { rol: 'SECRETARIA', sede: sedeAjena.slug });
});

afterAll(async () => {
  await panel.limpiar(async () => {
    await consultar(
      `DELETE FROM proclama_publicacion WHERE proclama_id IN
         (SELECT id FROM proclama WHERE nombre_contrayente_1 LIKE $1)`,
      [`${PREFIJO}%`],
    );
    await consultar('DELETE FROM proclama WHERE nombre_contrayente_1 LIKE $1', [`${PREFIJO}%`]);
    await consultar('DELETE FROM boletin WHERE titulo LIKE $1', [`${PREFIJO}%`]);
  });
  await cerrarPool();
  await cerrarRedis();
});

// ============================== Proclamas ==============================

describe('proclamas', () => {
  const RUTA = '/api/admin/proclamas';
  const proclama = (extra = {}) => ({
    contrayente1: `${PREFIJO} Luis ${++contador}`,
    contrayente2: 'Andrea Mamani C.',
    fechaMatrimonio: '2032-12-05T12:00:00-04:00',
    ...extra,
  });

  async function crear(quien, extra) {
    const respuesta = await como(quien).post(RUTA, proclama(extra));
    expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
    return respuesta.body.datos;
  }

  describe('permisos', () => {
    it('sin sesión 401; Marketing lee pero no escribe (403)', async () => {
      expect((await como().get(RUTA)).status).toBe(401);
      expect((await como('marketing').get(RUTA)).status).toBe(200);

      const propia = await crear('secretaria');
      expect((await como('marketing').post(RUTA, proclama())).status).toBe(403);
      expect(
        (await como('marketing').patch(`${RUTA}/${propia.id}`, { contrayente1: 'x' })).status,
      ).toBe(403);
      expect((await como('marketing').delete(`${RUTA}/${propia.id}`)).status).toBe(403);
      expect(
        (
          await como('marketing').post(`${RUTA}/${propia.id}/publicaciones`, {
            fecha: '2032-11-01',
          })
        ).status,
      ).toBe(403);
    });
  });

  describe('POST /api/admin/proclamas', () => {
    it('crea con sus publicaciones, el objeto del contrato, Location y bitácora', async () => {
      const respuesta = await como('secretaria').post(
        RUTA,
        proclama({
          publicaciones: [
            { fecha: '2020-10-25' },
            { fecha: '2020-11-01' },
            { fecha: '2032-11-08' },
          ],
        }),
      );

      expect(respuesta.status).toBe(201);
      const datos = respuesta.body.datos;
      expect(respuesta.headers.location).toBe(`/api/admin/proclamas/${datos.id}`);
      expect(Object.keys(datos)).toEqual(
        Object.keys(ejemploDelContrato('## 10. Proclamas', 0, 'admin.md')),
      );
      expect(datos).toMatchObject({
        sede: { id: sede.id, slug: sede.slug },
        fechaMatrimonio: '2032-12-05T12:00:00-04:00',
        tramiteOrigenId: null,
        fechaRegistro: expect.stringMatching(/-04:00$/),
        // La tercera es futura: se lista, pero todavía no cuenta como publicada.
        numeroProclama: 2,
        publicaciones: [
          { numero: 1, fecha: '2020-10-25' },
          { numero: 2, fecha: '2020-11-01' },
          { numero: 3, fecha: '2032-11-08' },
        ],
        vigente: true,
      });

      const [registro] = await registrosDe('proclama', datos.id);
      expect(registro).toMatchObject({
        usuario_id: usuarios.secretaria.id,
        accion: 'INSERT',
        datos_anteriores: null,
        datos_nuevos: {
          id: datos.id,
          sede_id: sede.id,
          publicaciones: [
            { numero: 1, fecha: '2020-10-25' },
            { numero: 2, fecha: '2020-11-01' },
            { numero: 3, fecha: '2032-11-08' },
          ],
        },
      });
    });

    it('sin publicaciones: numeroProclama null y no vigente', async () => {
      const creada = await crear('secretaria');
      expect(creada).toMatchObject({ numeroProclama: null, publicaciones: [], vigente: false });
    });

    it('una proclama con la boda ya celebrada no es vigente', async () => {
      const pasada = await crear('secretaria', {
        fechaMatrimonio: '2021-03-06T11:00:00-04:00',
        publicaciones: [{ fecha: '2021-02-20' }],
      });
      expect(pasada).toMatchObject({ numeroProclama: 1, vigente: false });
    });

    it('valida el cuerpo y las fechas de las publicaciones, con la ruta de cada campo', async () => {
      const cuerpo = await como('secretaria').post(RUTA, {
        contrayente1: '',
        contrayente2: 'x'.repeat(151),
        fechaMatrimonio: '2032-12-05T12:00:00',
        tramiteOrigenId: 'x',
        extra: 1,
        publicaciones: [{ fecha: '2032-13-01' }],
      });
      expect(cuerpo.status).toBe(400);
      expect(cuerpo.body.error.detalles.map((d) => d.campo).sort()).toEqual(
        [
          'contrayente1',
          'contrayente2',
          'extra',
          'fechaMatrimonio',
          'publicaciones.0.fecha',
          'tramiteOrigenId',
        ].sort(),
      );

      const cuatro = await como('secretaria').post(
        RUTA,
        proclama({
          publicaciones: ['2032-01-01', '2032-01-08', '2032-01-15', '2032-01-22'].map((fecha) => ({
            fecha,
          })),
        }),
      );
      expect(cuatro.status).toBe(400);
      expect(cuatro.body.error.detalles[0]).toEqual({
        campo: 'publicaciones',
        mensaje: 'Una proclama tiene hasta 3 publicaciones.',
      });

      const fechas = await como('secretaria').post(
        RUTA,
        proclama({
          publicaciones: [
            { fecha: '2032-11-08' },
            { fecha: '2032-11-01' },
            { fecha: '2032-12-05' },
          ],
        }),
      );
      expect(fechas.body.error.detalles).toEqual([
        { campo: 'publicaciones.1.fecha', mensaje: 'Debe ser posterior a la proclama anterior.' },
        { campo: 'publicaciones.2.fecha', mensaje: 'Debe ser anterior a la fecha del matrimonio.' },
      ]);
    });

    it('un trámite de origen repetido es 409; sin trámite pueden existir varias', async () => {
      const tramite = 900_000 + (Date.now() % 90_000);
      await crear('secretaria', { tramiteOrigenId: tramite });
      const repetida = await como('secretaria').post(RUTA, proclama({ tramiteOrigenId: tramite }));
      expect(repetida.status).toBe(409);
      expect(repetida.body.error.detalles).toEqual([
        { campo: 'tramiteOrigenId', mensaje: 'Ya está en uso.' },
      ]);
    });

    it('sede: el Administrador sin sede indica sedeId; los demás usan la suya', async () => {
      expect((await como('admin').post(RUTA, proclama())).body.error.detalles).toEqual([
        { campo: 'sedeId', mensaje: 'Indica la sede.' },
      ]);
      expect((await crear('admin', { sedeId: sedeAjena.id })).sede.id).toBe(sedeAjena.id);
      expect((await crear('secretaria', { sedeId: sedeAjena.id })).sede.id).toBe(sede.id);
    });
  });

  describe('GET /api/admin/proclamas', () => {
    const lista = `${PREFIJO} lista`;
    let vigente;
    let celebrada;
    let ajena;
    const buscar = (extra = '') =>
      `${RUTA}?porPagina=50&buscar=${encodeURIComponent(lista)}${extra}`;
    const ids = (respuesta) => respuesta.body.datos.map((p) => p.id);

    beforeAll(async () => {
      vigente = await crear('secretaria', {
        contrayente1: `${lista} Ñusta`,
        fechaMatrimonio: '2032-06-05T11:00:00-04:00',
        publicaciones: [{ fecha: '2020-05-01' }],
      });
      celebrada = await crear('secretaria', {
        contrayente1: `${lista} Diego`,
        fechaMatrimonio: '2021-03-06T11:00:00-04:00',
        publicaciones: [{ fecha: '2021-02-20' }],
      });
      ajena = await crear('secretariaAjena', {
        contrayente1: `${lista} Ajeno`,
        fechaMatrimonio: '2033-01-05T11:00:00-04:00',
      });
    });

    it('pagina, ordena por fecha de matrimonio y filtra por vigentes y año', async () => {
      const asc = await como('parroco').get(buscar());
      expect(asc.status).toBe(200);
      expect(ids(asc)).toEqual([celebrada.id, vigente.id]);
      expect(asc.body.paginacion).toEqual({ pagina: 1, porPagina: 50, total: 2, totalPaginas: 1 });

      expect(ids(await como('parroco').get(buscar('&orden=-fechaMatrimonio')))).toEqual([
        vigente.id,
        celebrada.id,
      ]);
      expect(ids(await como('parroco').get(buscar('&vigentes=true')))).toEqual([vigente.id]);
      expect(ids(await como('parroco').get(buscar('&vigentes=false')))).toEqual([celebrada.id]);
      expect(ids(await como('parroco').get(buscar('&anio=2021')))).toEqual([celebrada.id]);
    });

    it('busca por nombre sin distinguir mayúsculas ni acentos', async () => {
      const respuesta = await como('parroco').get(`${RUTA}?buscar=${encodeURIComponent('ÑUSTA')}`);
      expect(ids(respuesta)).toContain(vigente.id);
      const otra = await como('parroco').get(`${RUTA}?buscar=nusta`);
      expect(ids(otra)).toContain(vigente.id);
    });

    it('valida los parámetros; cada rol ve su sede y el Administrador filtra por sede', async () => {
      const invalido = await como('parroco').get(`${RUTA}?vigentes=quizas&anio=1800&orden=x`);
      expect(invalido.body.error.detalles.map((d) => d.campo).sort()).toEqual([
        'query.anio',
        'query.orden',
        'query.vigentes',
      ]);
      expect(ids(await como('secretariaAjena').get(buscar()))).toEqual([ajena.id]);
      expect((await como('secretaria').get(`${RUTA}?sede=${sedeAjena.slug}`)).status).toBe(403);
      expect(ids(await como('admin').get(buscar(`&sede=${sedeAjena.slug}`)))).toEqual([ajena.id]);
    });

    it('el detalle: 404, 403 por sede y 400 si el id no es un número', async () => {
      expect((await como('parroco').get(`${RUTA}/${vigente.id}`)).body.datos.id).toBe(vigente.id);
      expect((await como('parroco').get(`${RUTA}/999999999`)).status).toBe(404);
      expect((await como('parroco').get(`${RUTA}/${ajena.id}`)).status).toBe(403);
      expect((await como('parroco').get(`${RUTA}/abc`)).status).toBe(400);
    });
  });

  describe('PATCH /api/admin/proclamas/:id', () => {
    it('cambia nombres o fecha de la boda y lo registra', async () => {
      const creada = await crear('secretaria', { publicaciones: [{ fecha: '2032-11-01' }] });
      const respuesta = await como('parroco').patch(`${RUTA}/${creada.id}`, {
        contrayente2: 'María Fernanda R. V.',
        fechaMatrimonio: '2032-12-12T10:00:00-04:00',
      });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.datos).toMatchObject({
        contrayente1: creada.contrayente1,
        contrayente2: 'María Fernanda R. V.',
        fechaMatrimonio: '2032-12-12T10:00:00-04:00',
        publicaciones: [{ numero: 1, fecha: '2032-11-01' }],
      });
      expect((await registrosDe('proclama', creada.id)).at(-1)).toMatchObject({
        usuario_id: usuarios.parroco.id,
        accion: 'UPDATE',
        datos_anteriores: { nombre_contrayente_2: 'Andrea Mamani C.' },
        datos_nuevos: { nombre_contrayente_2: 'María Fernanda R. V.' },
      });
    });

    it('la boda no puede quedar antes de una publicación; no acepta otros campos', async () => {
      const creada = await crear('secretaria', { publicaciones: [{ fecha: '2032-11-20' }] });
      const antes = await como('secretaria').patch(`${RUTA}/${creada.id}`, {
        fechaMatrimonio: '2032-11-20T10:00:00-04:00',
      });
      expect(antes.status).toBe(400);
      expect(antes.body.error.detalles[0].campo).toBe('fechaMatrimonio');

      const otros = await como('secretaria').patch(`${RUTA}/${creada.id}`, {
        tramiteOrigenId: 5,
        publicaciones: [],
      });
      expect(otros.body.error.detalles.map((d) => d.campo).sort()).toEqual([
        'publicaciones',
        'tramiteOrigenId',
      ]);
    });

    it('404 y 403 por sede', async () => {
      const ajena = await crear('secretariaAjena');
      expect(
        (await como('secretaria').patch(`${RUTA}/999999999`, { contrayente1: 'x' })).status,
      ).toBe(404);
      expect(
        (await como('secretaria').patch(`${RUTA}/${ajena.id}`, { contrayente1: 'x' })).status,
      ).toBe(403);
    });
  });

  describe('publicaciones de una proclama', () => {
    it('agrega con número automático (1, 2, 3); la cuarta es 409', async () => {
      const creada = await crear('secretaria');
      const agregar = (fecha, quien = 'secretaria') =>
        como(quien).post(`${RUTA}/${creada.id}/publicaciones`, { fecha });

      const primera = await agregar('2032-11-01');
      expect(primera.status).toBe(201);
      expect(primera.headers.location).toBe(`/api/admin/proclamas/${creada.id}`);
      expect(primera.body.datos.publicaciones).toEqual([{ numero: 1, fecha: '2032-11-01' }]);
      await agregar('2032-11-08');
      const tercera = await agregar('2032-11-15');
      expect(tercera.body.datos.publicaciones.map((p) => p.numero)).toEqual([1, 2, 3]);

      const cuarta = await agregar('2032-11-22');
      expect(cuarta.status).toBe(409);
      expect(cuarta.body.error.mensaje).toBe('La proclama ya tiene sus 3 publicaciones.');

      expect((await registrosDe('proclama', creada.id)).length).toBe(4);
    });

    it('la fecha debe ser posterior a la anterior y anterior a la boda (400 en fecha)', async () => {
      const creada = await crear('secretaria', { publicaciones: [{ fecha: '2032-11-08' }] });
      const agregar = (fecha) =>
        como('secretaria').post(`${RUTA}/${creada.id}/publicaciones`, { fecha });

      expect((await agregar('2032-11-08')).body.error.detalles).toEqual([
        { campo: 'fecha', mensaje: 'Debe ser posterior a la proclama anterior.' },
      ]);
      expect((await agregar('2032-12-05')).body.error.detalles).toEqual([
        { campo: 'fecha', mensaje: 'Debe ser anterior a la fecha del matrimonio.' },
      ]);
      expect((await agregar('2032-02-30')).status).toBe(400);
      expect((await como('secretaria').post(`${RUTA}/${creada.id}/publicaciones`, {})).status).toBe(
        400,
      );
    });

    it('cambia la fecha de una publicación sin salirse del orden', async () => {
      const creada = await crear('secretaria', {
        publicaciones: [{ fecha: '2032-11-01' }, { fecha: '2032-11-08' }, { fecha: '2032-11-15' }],
      });
      const cambiar = (numero, fecha) =>
        como('parroco').patch(`${RUTA}/${creada.id}/publicaciones/${numero}`, { fecha });

      const bien = await cambiar(2, '2032-11-10');
      expect(bien.status).toBe(200);
      expect(bien.body.datos.publicaciones[1]).toEqual({ numero: 2, fecha: '2032-11-10' });
      expect((await cambiar(2, '2032-11-15')).status).toBe(400);
      expect((await cambiar(2, '2032-10-30')).status).toBe(400);
      expect((await cambiar(1, '2032-12-06')).status).toBe(400);
      expect((await cambiar(4, '2032-11-30')).status).toBe(400);
      expect((await cambiar(0, '2032-11-30')).status).toBe(400);
    });

    it('un número que la proclama no tiene es 404', async () => {
      const creada = await crear('secretaria', { publicaciones: [{ fecha: '2032-11-01' }] });
      expect(
        (
          await como('secretaria').patch(`${RUTA}/${creada.id}/publicaciones/3`, {
            fecha: '2032-11-20',
          })
        ).status,
      ).toBe(404);
      expect((await como('secretaria').delete(`${RUTA}/${creada.id}/publicaciones/2`)).status).toBe(
        404,
      );
    });

    it('solo se quita la última publicación', async () => {
      const creada = await crear('secretaria', {
        publicaciones: [{ fecha: '2032-11-01' }, { fecha: '2032-11-08' }],
      });
      const primera = await como('secretaria').delete(`${RUTA}/${creada.id}/publicaciones/1`);
      expect(primera.status).toBe(409);
      expect(primera.body.error.mensaje).toBe('Solo se puede quitar la última publicación (la 2).');

      const ultima = await como('secretaria').delete(`${RUTA}/${creada.id}/publicaciones/2`);
      expect(ultima.status).toBe(200);
      expect(ultima.body.datos.publicaciones).toEqual([{ numero: 1, fecha: '2032-11-01' }]);
    });

    it('403 en una proclama de otra sede', async () => {
      const ajena = await crear('secretariaAjena', { publicaciones: [{ fecha: '2032-11-01' }] });
      expect(
        (
          await como('secretaria').post(`${RUTA}/${ajena.id}/publicaciones`, {
            fecha: '2032-11-08',
          })
        ).status,
      ).toBe(403);
      expect((await como('secretaria').delete(`${RUTA}/${ajena.id}/publicaciones/1`)).status).toBe(
        403,
      );
    });
  });

  describe('DELETE /api/admin/proclamas/:id', () => {
    it('elimina la proclama y sus publicaciones si ninguna llegó a su fecha', async () => {
      const creada = await crear('secretaria', {
        publicaciones: [{ fecha: '2032-11-01' }, { fecha: '2032-11-08' }],
      });
      expect((await como('secretaria').delete(`${RUTA}/${creada.id}`)).status).toBe(204);
      expect((await como('secretaria').get(`${RUTA}/${creada.id}`)).status).toBe(404);

      const { rows } = await consultar(
        'SELECT count(*)::int AS n FROM proclama_publicacion WHERE proclama_id = $1',
        [creada.id],
      );
      expect(rows[0].n).toBe(0);
      expect((await registrosDe('proclama', creada.id)).at(-1)).toMatchObject({
        accion: 'DELETE',
        datos_anteriores: { id: creada.id, publicaciones: [{ numero: 1 }, { numero: 2 }] },
        datos_nuevos: null,
      });
    });

    it('con una publicación ya alcanzada es 409 y no se borra nada: el historial es público', async () => {
      const creada = await crear('secretaria', { publicaciones: [{ fecha: '2020-10-25' }] });
      const respuesta = await como('admin').delete(`${RUTA}/${creada.id}`);

      expect(respuesta.status).toBe(409);
      expect(respuesta.body.error.codigo).toBe('CONFLICTO');
      expect((await como('secretaria').get(`${RUTA}/${creada.id}`)).status).toBe(200);
    });

    it('404 y 403 por sede', async () => {
      const ajena = await crear('secretariaAjena');
      expect((await como('secretaria').delete(`${RUTA}/999999999`)).status).toBe(404);
      expect((await como('secretaria').delete(`${RUTA}/${ajena.id}`)).status).toBe(403);
    });
  });
});

// ============================== Boletines ==============================

describe('boletines', () => {
  const RUTA = '/api/admin/boletines';
  let pdf;
  let pdfAjeno;
  let imagen;
  let siguiente = 0;

  // Cada creación usa un periodo distinto (2110-01, 2111-01…): (sede, periodo) es único.
  const nuevoPeriodo = () => `${2110 + siguiente++}-01`;
  const boletin = (extra = {}) => ({
    titulo: `${PREFIJO} boletín ${++contador}`,
    periodo: nuevoPeriodo(),
    archivoId: pdf.id,
    ...extra,
  });

  async function crear(quien, extra) {
    const respuesta = await como(quien).post(RUTA, boletin(extra));
    expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
    return respuesta.body.datos;
  }

  beforeAll(async () => {
    pdf = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: usuarios.secretaria.id,
      tipoMime: 'application/pdf',
      clave: `sedes/${sede.slug}/2026/11/8f3c2a1d-5b7e-4c90-a1f4-${String(Date.now()).slice(-12)}.pdf`,
    });
    pdfAjeno = await panel.crearArchivo({
      sedeId: sedeAjena.id,
      subidoPor: usuarios.secretariaAjena.id,
      tipoMime: 'application/pdf',
    });
    imagen = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: usuarios.secretaria.id,
      tipoMime: 'image/webp',
    });
  });

  describe('permisos', () => {
    it('sin sesión 401; Marketing sí puede publicar boletines (boletines.gestionar)', async () => {
      expect((await como().get(RUTA)).status).toBe(401);
      const creado = await como('marketing').post(RUTA, boletin());
      expect(creado.status).toBe(201);
      expect(creado.body.datos.publicadoPor.id).toBe(usuarios.marketing.id);
    });
  });

  describe('POST /api/admin/boletines', () => {
    it('publica con el objeto del contrato, Location y bitácora; el periodo es el 1.er día del mes', async () => {
      const periodo = nuevoPeriodo();
      const respuesta = await como('secretaria').post(RUTA, boletin({ periodo }));

      expect(respuesta.status).toBe(201);
      const datos = respuesta.body.datos;
      expect(respuesta.headers.location).toBe(`/api/admin/boletines/${datos.id}`);
      expect(Object.keys(datos)).toEqual(
        expect.arrayContaining(
          Object.keys(ejemploDelContrato('## `GET /api/sedes/:sede/boletines`')['datos'][0]),
        ),
      );
      expect(datos).toMatchObject({
        periodo: `${periodo}-01`,
        fechaPublicacion: expect.stringMatching(/-04:00$/),
        archivo: {
          id: pdf.id,
          url: `https://cdn.ejemplo.test/${pdf.url}`,
          tipoMime: 'application/pdf',
          tamanoBytes: 1000,
        },
        sede: { id: sede.id, slug: sede.slug },
        publicadoPor: { id: usuarios.secretaria.id, nombreCompleto: expect.any(String) },
      });

      expect((await registrosDe('boletin', datos.id))[0]).toMatchObject({
        usuario_id: usuarios.secretaria.id,
        accion: 'INSERT',
        datos_nuevos: {
          id: datos.id,
          sede_id: sede.id,
          periodo: `${periodo}-01`,
          archivo_id: pdf.id,
        },
      });
    });

    it('un periodo repetido en la sede es 409; en otra sede no choca', async () => {
      const periodo = nuevoPeriodo();
      await crear('secretaria', { periodo });

      const repetido = await como('parroco').post(RUTA, boletin({ periodo }));
      expect(repetido.status).toBe(409);
      expect(repetido.body.error).toMatchObject({
        codigo: 'CONFLICTO',
        detalles: [{ campo: 'periodo', mensaje: expect.any(String) }],
      });

      const otraSede = await como('admin').post(
        RUTA,
        boletin({ periodo, sedeId: sedeAjena.id, archivoId: pdfAjeno.id }),
      );
      expect(otraSede.status).toBe(201);
    });

    it('el archivo debe ser un PDF de la misma sede (400 en archivoId)', async () => {
      const mensajes = async (archivoId) =>
        (await como('secretaria').post(RUTA, boletin({ archivoId }))).body.error.detalles;

      expect(await mensajes(imagen.id)).toEqual([
        { campo: 'archivoId', mensaje: 'El archivo no es un documento PDF.' },
      ]);
      expect(await mensajes(pdfAjeno.id)).toEqual([
        {
          campo: 'archivoId',
          mensaje: 'Debe ser un documento PDF de la biblioteca multimedia de esta sede.',
        },
      ]);
      expect((await mensajes(999999999))[0].campo).toBe('archivoId');
    });

    it('valida el cuerpo: título, periodo AAAA-MM, archivo y campos desconocidos', async () => {
      const respuesta = await como('secretaria').post(RUTA, {
        titulo: '',
        periodo: '2026-13',
        otro: 1,
      });
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual(
        ['archivoId', 'otro', 'periodo', 'titulo'].sort(),
      );
      expect((await como('secretaria').post(RUTA, boletin({ periodo: '2026-11-01' }))).status).toBe(
        400,
      );
      expect(
        (await como('secretaria').post(RUTA, boletin({ titulo: 'x'.repeat(151) }))).status,
      ).toBe(400);
    });

    it('sede: el Administrador sin sede indica sedeId; los demás usan la suya', async () => {
      expect((await como('admin').post(RUTA, boletin())).body.error.detalles).toEqual([
        { campo: 'sedeId', mensaje: 'Indica la sede.' },
      ]);
      expect((await crear('secretaria', { sedeId: sedeAjena.id })).sede.id).toBe(sede.id);
    });
  });

  describe('GET /api/admin/boletines', () => {
    let antiguo;
    let reciente;
    let ajeno;
    const propios = (respuesta) =>
      respuesta.body.datos.filter((b) => b.titulo.startsWith(`${PREFIJO} lista`)).map((b) => b.id);

    beforeAll(async () => {
      antiguo = await crear('secretaria', { titulo: `${PREFIJO} lista a`, periodo: '2100-02' });
      reciente = await crear('secretaria', { titulo: `${PREFIJO} lista b`, periodo: '2100-05' });
      ajeno = await crear('secretariaAjena', {
        titulo: `${PREFIJO} lista c`,
        periodo: '2100-03',
        archivoId: pdfAjeno.id,
      });
    });

    it('pagina del más reciente al más antiguo y filtra por año', async () => {
      const respuesta = await como('parroco').get(`${RUTA}?porPagina=50&anio=2100`);
      expect(respuesta.status).toBe(200);
      expect(propios(respuesta)).toEqual([reciente.id, antiguo.id]);
      expect(respuesta.body.paginacion).toMatchObject({ pagina: 1, porPagina: 50, total: 2 });

      const pagina = await como('parroco').get(`${RUTA}?porPagina=1&pagina=2&anio=2100`);
      expect(pagina.body.datos.map((b) => b.id)).toEqual([antiguo.id]);
    });

    it('valida los parámetros; cada rol ve su sede y el Administrador filtra por sede', async () => {
      expect(
        (await como('parroco').get(`${RUTA}?anio=1800&porPagina=51`)).body.error.detalles
          .map((d) => d.campo)
          .sort(),
      ).toEqual(['query.anio', 'query.porPagina']);
      expect(propios(await como('secretariaAjena').get(`${RUTA}?anio=2100`))).toEqual([ajeno.id]);
      expect((await como('secretaria').get(`${RUTA}?sede=${sedeAjena.slug}`)).status).toBe(403);
      expect(propios(await como('admin').get(`${RUTA}?anio=2100&sede=${sedeAjena.slug}`))).toEqual([
        ajeno.id,
      ]);
    });

    it('el detalle: 404, 403 por sede y 400 si el id no es un número', async () => {
      expect((await como('parroco').get(`${RUTA}/${reciente.id}`)).body.datos.id).toBe(reciente.id);
      expect((await como('parroco').get(`${RUTA}/999999999`)).status).toBe(404);
      expect((await como('parroco').get(`${RUTA}/${ajeno.id}`)).status).toBe(403);
      expect((await como('parroco').get(`${RUTA}/abc`)).status).toBe(400);
    });
  });

  describe('PATCH /api/admin/boletines/:id', () => {
    it('cambia el título, el periodo o reemplaza el PDF, y registra solo lo que cambió', async () => {
      const creado = await crear('secretaria');
      const otroPdf = await panel.crearArchivo({
        sedeId: sede.id,
        subidoPor: usuarios.secretaria.id,
        tipoMime: 'application/pdf',
      });
      const periodo = nuevoPeriodo();

      const respuesta = await como('parroco').patch(`${RUTA}/${creado.id}`, {
        titulo: `${PREFIJO} editado`,
        periodo,
        archivoId: otroPdf.id,
      });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.datos).toMatchObject({
        titulo: `${PREFIJO} editado`,
        periodo: `${periodo}-01`,
        archivo: { id: otroPdf.id },
        publicadoPor: { id: usuarios.secretaria.id },
      });
      expect((await registrosDe('boletin', creado.id)).at(-1)).toMatchObject({
        usuario_id: usuarios.parroco.id,
        accion: 'UPDATE',
        datos_anteriores: { titulo: creado.titulo, archivo_id: pdf.id },
        datos_nuevos: { titulo: `${PREFIJO} editado`, archivo_id: otroPdf.id },
      });
    });

    it('un periodo ya usado es 409; un archivo que no es PDF de la sede es 400; no cambia nada', async () => {
      const a = await crear('secretaria');
      const b = await crear('secretaria');

      expect(
        (await como('secretaria').patch(`${RUTA}/${b.id}`, { periodo: a.periodo.slice(0, 7) }))
          .status,
      ).toBe(409);
      const archivo = await como('secretaria').patch(`${RUTA}/${b.id}`, { archivoId: imagen.id });
      expect(archivo.body.error.detalles[0].campo).toBe('archivoId');
      expect((await como('secretaria').get(`${RUTA}/${b.id}`)).body.datos.periodo).toBe(b.periodo);
    });

    it('no acepta campos desconocidos; 404 y 403 por sede', async () => {
      const creado = await crear('secretaria');
      const ajeno = await crear('secretariaAjena', { archivoId: pdfAjeno.id });

      expect((await como('secretaria').patch(`${RUTA}/${creado.id}`, { sedeId: 1 })).status).toBe(
        400,
      );
      expect((await como('secretaria').patch(`${RUTA}/999999999`, { titulo: 'xx' })).status).toBe(
        404,
      );
      expect((await como('secretaria').patch(`${RUTA}/${ajeno.id}`, { titulo: 'xx' })).status).toBe(
        403,
      );
    });
  });

  describe('DELETE /api/admin/boletines/:id', () => {
    it('elimina (204), registra el DELETE y el PDF sigue en la biblioteca', async () => {
      const creado = await crear('secretaria');
      expect((await como('secretaria').delete(`${RUTA}/${creado.id}`)).status).toBe(204);
      expect((await como('secretaria').get(`${RUTA}/${creado.id}`)).status).toBe(404);
      expect((await registrosDe('boletin', creado.id)).at(-1)).toMatchObject({
        accion: 'DELETE',
        datos_anteriores: { id: creado.id },
        datos_nuevos: null,
      });

      const { rows } = await consultar('SELECT 1 FROM archivo_multimedia WHERE id = $1', [pdf.id]);
      expect(rows).toHaveLength(1);
    });

    it('404 y 403 por sede', async () => {
      const ajeno = await crear('secretariaAjena', { archivoId: pdfAjeno.id });
      expect((await como('secretaria').delete(`${RUTA}/999999999`)).status).toBe(404);
      expect((await como('secretaria').delete(`${RUTA}/${ajeno.id}`)).status).toBe(403);
    });
  });
});
