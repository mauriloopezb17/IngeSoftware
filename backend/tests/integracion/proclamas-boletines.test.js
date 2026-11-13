// Proclamas vigentes, historial y boletines. Del seed solo se comprueba la forma (sus fechas son
// relativas a la carga); las reglas se prueban con filas temporales de «resurreccion».
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

const app = createApp();
const SEDE = '/api/sedes/senor-de-la-exaltacion';
const TEMPORAL = '/api/sedes/resurreccion';
const TZ = "'America/La_Paz'";
const HOY = `(now() AT TIME ZONE ${TZ})::date`;

const sufijo = randomUUID().replaceAll('-', '').slice(0, 8);
const nombre = (caso) => `Prueba ${sufijo} ${caso}`;
const contrayentes = (respuesta) => respuesta.body.datos.map((p) => p.contrayente1);

// URL absoluta: no depende de que CDN_PUBLIC_URL esté configurada (en el CI no lo está).
const URL_PDF = `https://cdn.pasionistas.org.bo/sedes/resurreccion/2026/10/${sufijo}.pdf`;

let archivoId;

async function crearProclama(caso, bodaSql, publicacionesSql) {
  const { rows } = await consultar(
    `INSERT INTO proclama (sede_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio)
     VALUES ((SELECT id FROM sede WHERE slug = 'resurreccion'), $1, 'Pareja de prueba', ${bodaSql})
     RETURNING id`,
    [nombre(caso)],
  );
  for (const [numero, fechaSql] of publicacionesSql) {
    await consultar(
      `INSERT INTO proclama_publicacion (proclama_id, numero_proclama, fecha_publicacion) VALUES ($1, $2, ${fechaSql})`,
      [rows[0].id, numero],
    );
  }
}

beforeAll(async () => {
  // Boda en 30 días, 2 proclamas ya leídas y la 3.ª programada para mañana: solo cuentan las 2.
  await crearProclama('vigente', "now() + interval '30 days'", [
    [1, `${HOY} - 7`],
    [2, HOY],
    [3, `${HOY} + 1`],
  ]);
  await crearProclama('celebrada', "TIMESTAMPTZ '2025-06-14 11:00-04'", [
    [1, "DATE '2025-05-25'"],
    [2, "DATE '2025-06-01'"],
    [3, "DATE '2025-06-08'"],
  ]);
  // Todavía no se leyó ninguna: no es pública.
  await crearProclama('sin-publicar', "now() + interval '60 days'", [[1, `${HOY} + 7`]]);
  await crearProclama('sin-publicaciones', "now() + interval '60 days'", []);

  const archivo = await consultar(
    `INSERT INTO archivo_multimedia (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes)
     VALUES ((SELECT id FROM sede WHERE slug = 'resurreccion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
             'Boletín de prueba.pdf', $1, 'application/pdf', 2516582) RETURNING id`,
    [URL_PDF],
  );
  archivoId = archivo.rows[0].id;

  for (const [titulo, periodo, publicacion] of [
    ['Edición de octubre 2026', '2026-10-01', "TIMESTAMPTZ '2026-10-03 10:00-04'"],
    ['Edición de diciembre 2025', '2025-12-01', "TIMESTAMPTZ '2025-12-02 10:00-04'"],
    [
      'Edición programada',
      "(date_trunc('month', now()) + interval '2 months')::date",
      "now() + interval '1 day'",
    ],
  ]) {
    await consultar(
      `INSERT INTO boletin (sede_id, archivo_id, publicado_por, titulo, periodo, fecha_publicacion)
       VALUES ((SELECT id FROM sede WHERE slug = 'resurreccion'), $1,
               (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
               $2, ${periodo.startsWith('(') ? periodo : `'${periodo}'`}, ${publicacion})`,
      [archivoId, `${titulo} ${sufijo}`],
    );
  }
});

afterAll(async () => {
  await consultar('DELETE FROM boletin WHERE titulo LIKE $1', [`% ${sufijo}`]);
  await consultar('DELETE FROM archivo_multimedia WHERE id = $1', [archivoId]);
  await consultar(
    'DELETE FROM proclama_publicacion WHERE proclama_id IN (SELECT id FROM proclama WHERE nombre_contrayente_1 LIKE $1)',
    [`Prueba ${sufijo} %`],
  );
  await consultar('DELETE FROM proclama WHERE nombre_contrayente_1 LIKE $1', [
    `Prueba ${sufijo} %`,
  ]);
  await cerrarPool();
});

describe('GET /api/sedes/:sede/proclamas con el seed', () => {
  it('cada proclama tiene los campos del ejemplo del contrato', async () => {
    const [ejemplo] = ejemploDelContrato('## `GET /api/sedes/:sede/proclamas`').datos;
    const respuesta = await request(app).get(`${SEDE}/proclamas`);

    expect(respuesta.status).toBe(200);
    for (const proclama of respuesta.body.datos) {
      expect(Object.keys(proclama)).toEqual(Object.keys(ejemplo));
      expect(proclama.fechaMatrimonio).toMatch(/-04:00$/);
      expect(proclama.numeroProclama).toBe(proclama.publicaciones.at(-1).numero);
      expect(proclama.publicaciones[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const bodas = respuesta.body.datos.map((p) => p.fechaMatrimonio);
    expect(bodas).toEqual([...bodas].sort());
  });
});

describe('GET /api/sedes/:sede/proclamas: vigentes', () => {
  it('solo muestra las que tienen una publicación leída y la boda por delante', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/proclamas`);

    expect(respuesta.status).toBe(200);
    expect(contrayentes(respuesta)).toEqual([nombre('vigente')]);
  });

  it('cuenta solo las publicaciones cuya fecha ya llegó', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/proclamas`);

    expect(respuesta.body.datos[0].numeroProclama).toBe(2);
    expect(respuesta.body.datos[0].publicaciones.map((p) => p.numero)).toEqual([1, 2]);
  });

  it('responde 404 para una sede inexistente y lista vacía para una sede sin proclamas', async () => {
    const inexistente = await request(app).get('/api/sedes/no-existe/proclamas');
    const sinProclamas = await request(app).get(
      '/api/sedes/capilla-san-pablo-de-la-cruz/proclamas',
    );

    expect(inexistente.status).toBe(404);
    expect(sinProclamas.body).toEqual({ datos: [] });
  });
});

describe('GET /api/sedes/:sede/proclamas/historial', () => {
  it('incluye las ya celebradas, de la boda más reciente a la más antigua', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/proclamas/historial`);

    expect(respuesta.status).toBe(200);
    expect(contrayentes(respuesta)).toEqual([nombre('vigente'), nombre('celebrada')]);
    expect(respuesta.body.paginacion).toEqual({
      pagina: 1,
      porPagina: 10,
      total: 2,
      totalPaginas: 1,
    });
    expect(respuesta.body.datos[1]).toMatchObject({
      fechaMatrimonio: '2025-06-14T11:00:00-04:00',
      numeroProclama: 3,
      publicaciones: [
        { numero: 1, fecha: '2025-05-25' },
        { numero: 2, fecha: '2025-06-01' },
        { numero: 3, fecha: '2025-06-08' },
      ],
    });
  });

  it('filtra por año de la boda y pagina sin fallar fuera de rango', async () => {
    const delAnio = await request(app).get(`${TEMPORAL}/proclamas/historial?anio=2025`);
    const sinDatos = await request(app).get(`${TEMPORAL}/proclamas/historial?anio=2019`);
    const fuera = await request(app).get(`${TEMPORAL}/proclamas/historial?pagina=5`);

    expect(contrayentes(delAnio)).toEqual([nombre('celebrada')]);
    expect(sinDatos.body.paginacion).toEqual({
      pagina: 1,
      porPagina: 10,
      total: 0,
      totalPaginas: 0,
    });
    expect(fuera.status).toBe(200);
    expect(fuera.body.datos).toEqual([]);
    expect(fuera.body.paginacion).toEqual({ pagina: 5, porPagina: 10, total: 2, totalPaginas: 1 });
  });

  it('responde 400 si el año no es válido', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/proclamas/historial?anio=26&porPagina=0`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual([
      'query.anio',
      'query.porPagina',
    ]);
  });
});

describe('GET /api/sedes/:sede/boletines', () => {
  it('responde la lista del seed con la forma paginada del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}/boletines?porPagina=1`);

    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.datos)).toBe(true);
    expect(respuesta.body.paginacion).toMatchObject({ pagina: 1, porPagina: 1 });
  });

  it('el boletín coincide con el ejemplo del contrato (salvo los ids)', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/boletines?porPagina=1`);
    const [ejemplo] = ejemploDelContrato('## `GET /api/sedes/:sede/boletines`').datos;

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos[0]).toEqual({
      ...ejemplo,
      id: expect.any(Number),
      titulo: `Edición de octubre 2026 ${sufijo}`,
      archivo: {
        id: archivoId,
        url: URL_PDF,
        nombreOriginal: 'Boletín de prueba.pdf',
        tipoMime: 'application/pdf',
        tamanoBytes: 2516582,
      },
    });
    expect(Object.keys(respuesta.body.datos[0].archivo)).toEqual(Object.keys(ejemplo.archivo));
  });

  it('muestra solo los ya publicados, del periodo más reciente al más antiguo', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/boletines`);

    expect(respuesta.body.datos.map((b) => b.periodo)).toEqual(['2026-10-01', '2025-12-01']);
    expect(respuesta.body.paginacion).toEqual({
      pagina: 1,
      porPagina: 10,
      total: 2,
      totalPaginas: 1,
    });
  });

  it('filtra por año del periodo y pagina', async () => {
    const delAnio = await request(app).get(`${TEMPORAL}/boletines?anio=2025`);
    const segunda = await request(app).get(`${TEMPORAL}/boletines?porPagina=1&pagina=2`);
    const fuera = await request(app).get(`${TEMPORAL}/boletines?pagina=9`);

    expect(delAnio.body.datos.map((b) => b.periodo)).toEqual(['2025-12-01']);
    expect(segunda.body.datos.map((b) => b.periodo)).toEqual(['2025-12-01']);
    expect(fuera.body.datos).toEqual([]);
    expect(fuera.body.paginacion.total).toBe(2);
  });

  it('responde 400 si la query no es válida y 404 si la sede no existe', async () => {
    const invalida = await request(app).get(`${TEMPORAL}/boletines?anio=abc`);
    const inexistente = await request(app).get('/api/sedes/no-existe/boletines');

    expect(invalida.status).toBe(400);
    expect(invalida.body.error.detalles[0].campo).toBe('query.anio');
    expect(inexistente.status).toBe(404);
  });
});
