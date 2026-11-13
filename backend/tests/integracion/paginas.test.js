// Páginas con bloques contra el seed real. Los estados y los bloques ocultos se prueban con
// páginas temporales de la sede «resurreccion», que se borran al terminar.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

const app = createApp();
const SEDE = '/api/sedes/senor-de-la-exaltacion/paginas';
const TEMPORAL = '/api/sedes/resurreccion/paginas';

const sufijo = randomUUID().replaceAll('-', '').slice(0, 8);
const slugDe = (caso) => `pr-${sufijo}-${caso}`;
const sede = "(SELECT id FROM sede WHERE slug = 'resurreccion')";

async function crearPagina(
  caso,
  { estado = 'Publicado', menu = false, orden = 0, padre = null } = {},
) {
  await consultar(
    `INSERT INTO pagina (sede_id, estado_publicacion_id, creado_por, slug, titulo, mostrar_en_menu, orden_menu, pagina_padre_id, descripcion_seo, fecha_actualizacion)
     VALUES (${sede}, (SELECT id FROM estado_publicacion WHERE nombre = $1),
             (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
             $2, $3, $4, $5, (SELECT id FROM pagina WHERE slug = $6), $7, TIMESTAMPTZ '2026-11-02 20:20:00+00')`,
    [
      estado,
      slugDe(caso),
      `Prueba ${caso}`,
      menu,
      orden,
      padre ? slugDe(padre) : null,
      `SEO ${caso}`,
    ],
  );
}

beforeAll(async () => {
  await crearPagina('historia', { menu: true, orden: 20 });
  await crearPagina('primera', { menu: true, orden: 10 });
  await crearPagina('borrador', { estado: 'Borrador', menu: true, orden: 1 });
  await crearPagina('archivada', { estado: 'Archivado', menu: true, orden: 2 });
  await crearPagina('sin-menu');
  await crearPagina('hija', { padre: 'historia' });

  // Bloques de «historia»: orden 1, 2 (oculto) y 3, insertados desordenados.
  await consultar(
    `INSERT INTO bloque (pagina_id, tipo_bloque_id, orden, contenido, visible)
     SELECT p.id, (SELECT id FROM tipo_bloque WHERE codigo = 'cita'), v.orden, v.contenido::jsonb, v.visible
       FROM pagina p, (VALUES (3, '{"texto": "tercero", "autor_del_texto": "x"}', true),
                              (1, '{"texto": "primero"}', true),
                              (2, '{"texto": "oculto"}', false)) v(orden, contenido, visible)
      WHERE p.slug = $1`,
    [slugDe('historia')],
  );
});

afterAll(async () => {
  const pagina = 'SELECT id FROM pagina WHERE slug LIKE $1';
  await consultar(`DELETE FROM bloque WHERE pagina_id IN (${pagina})`, [`pr-${sufijo}-%`]);
  await consultar('DELETE FROM pagina WHERE slug = $1', [slugDe('hija')]);
  await consultar('DELETE FROM pagina WHERE slug LIKE $1', [`pr-${sufijo}-%`]);
  await cerrarPool();
});

describe('GET /api/sedes/:sede/paginas', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(SEDE);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/sedes/:sede/paginas`'));
  });

  it('muestra solo las publicadas del menú, por orden de menú', async () => {
    const respuesta = await request(app).get(TEMPORAL);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.map((p) => p.slug)).toEqual([
      slugDe('primera'),
      slugDe('historia'),
    ]);
    expect(respuesta.body.datos[1]).toEqual({
      id: expect.any(Number),
      slug: slugDe('historia'),
      titulo: 'Prueba historia',
      paginaPadreId: null,
      ordenMenu: 20,
    });
  });

  it('responde 404 para una sede inexistente y lista vacía para una sede sin páginas', async () => {
    const inexistente = await request(app).get('/api/sedes/no-existe/paginas');
    const sinPaginas = await request(app).get('/api/sedes/capilla-san-pablo-de-la-cruz/paginas');

    expect(inexistente.status).toBe(404);
    expect(sinPaginas.body).toEqual({ datos: [] });
  });
});

describe('GET /api/sedes/:sede/paginas/:slug', () => {
  it.each([
    ['inicio', 0],
    ['nosotros', 1],
  ])('la página «%s» coincide con el ejemplo del contrato', async (slug, indice) => {
    const respuesta = await request(app).get(`${SEDE}/${slug}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(
      ejemploDelContrato('## `GET /api/sedes/:sede/paginas/:slug`', indice),
    );
  });

  it('devuelve los bloques visibles en orden y con su contenido sin traducir', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/${slugDe('historia')}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toMatchObject({
      slug: slugDe('historia'),
      descripcionSeo: 'SEO historia',
      paginaPadre: null,
      fechaActualizacion: '2026-11-02T16:20:00-04:00',
    });
    expect(respuesta.body.datos.bloques).toEqual([
      { id: expect.any(Number), tipo: 'cita', orden: 1, contenido: { texto: 'primero' } },
      {
        id: expect.any(Number),
        tipo: 'cita',
        orden: 3,
        contenido: { texto: 'tercero', autor_del_texto: 'x' },
      },
    ]);
  });

  it('incluye la página padre y devuelve bloques vacíos si la página no tiene', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/${slugDe('hija')}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.paginaPadre).toEqual({
      id: expect.any(Number),
      slug: slugDe('historia'),
      titulo: 'Prueba historia',
    });
    expect(respuesta.body.datos.bloques).toEqual([]);
  });

  it('muestra una página publicada aunque no esté en el menú', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/${slugDe('sin-menu')}`);

    expect(respuesta.status).toBe(200);
  });

  it.each([
    ['en borrador', () => `${TEMPORAL}/${slugDe('borrador')}`, () => slugDe('borrador')],
    ['archivada', () => `${TEMPORAL}/${slugDe('archivada')}`, () => slugDe('archivada')],
    ['de otra sede', () => `${TEMPORAL}/inicio`, () => 'inicio'],
    ['inexistente', () => `${SEDE}/no-existe`, () => 'no-existe'],
    ['con formato imposible', () => `${SEDE}/Inicio`, () => 'Inicio'],
  ])('responde 404 para una página %s', async (_caso, ruta, slug) => {
    const respuesta = await request(app).get(ruta());

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toEqual({
      codigo: 'NO_ENCONTRADO',
      mensaje: `No existe la página «${slug()}».`,
      detalles: [],
    });
  });
});
