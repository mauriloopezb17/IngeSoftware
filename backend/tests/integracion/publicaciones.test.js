// Publicaciones, categorías y categorías de evento contra el seed real.
// Las reglas de vigencia (borrador, en revisión, programada, expirada) se prueban con filas
// temporales de la sede «resurreccion», que se borran al terminar.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

const app = createApp();
const SEDE = '/api/sedes/senor-de-la-exaltacion/publicaciones';
const TEMPORAL = '/api/sedes/resurreccion/publicaciones';

const sufijo = randomUUID().replaceAll('-', '').slice(0, 8);
const slugDe = (caso) => `prueba-pub-${sufijo}-${caso}`;
const FECHA_ISO_BOLIVIA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/;

// caso -> [estado, fecha_publicacion, fecha_expiracion, destacada]
const CASOS = {
  vigente: ['Publicado', "now() - interval '1 hour'", 'NULL', true],
  'vigente-con-expiracion': [
    'Publicado',
    "now() - interval '1 day'",
    "now() + interval '1 day'",
    false,
  ],
  borrador: ['Borrador', "now() - interval '1 hour'", 'NULL', false],
  'en-revision': ['En revisión', "now() - interval '1 hour'", 'NULL', false],
  archivada: ['Archivado', "now() - interval '1 hour'", 'NULL', false],
  programada: ['Publicado', "now() + interval '1 day'", 'NULL', false],
  expirada: ['Publicado', "now() - interval '2 days'", "now() - interval '1 minute'", false],
  'sin-fecha': ['Publicado', 'NULL', 'NULL', false],
};
const VIGENTES = ['vigente', 'vigente-con-expiracion'];

beforeAll(async () => {
  for (const [caso, [estado, publicacion, expiracion, destacada]] of Object.entries(CASOS)) {
    await consultar(
      `INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, contenido, destacada, fecha_publicacion, fecha_expiracion)
       VALUES ((SELECT id FROM sede WHERE slug = 'resurreccion'),
               (SELECT id FROM tipo_publicacion WHERE nombre = 'Noticia'),
               (SELECT id FROM estado_publicacion WHERE nombre = $1),
               (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
               $2, $3, '{"formato":"blocknote","version":1,"bloques":[]}', $4,
               ${publicacion}, ${expiracion})`,
      [estado, `Prueba ${sufijo} ${caso}`, slugDe(caso), destacada],
    );
  }
});

afterAll(async () => {
  await consultar('DELETE FROM publicacion WHERE slug LIKE $1', [`prueba-pub-${sufijo}-%`]);
  await cerrarPool();
});

describe('GET /api/sedes/:sede/publicaciones', () => {
  it('las noticias coinciden con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}?tipo=NOTICIA,NOTA_DE_PRENSA&porPagina=3`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(
      ejemploDelContrato('## `GET /api/sedes/:sede/publicaciones`', 0),
    );
  });

  it('los avisos coinciden con el ejemplo, salvo la fecha (el seed las fecha respecto a su carga)', async () => {
    const respuesta = await request(app).get(`${SEDE}?tipo=AVISO&porPagina=3`);
    const ejemplo = ejemploDelContrato('## `GET /api/sedes/:sede/publicaciones`', 1);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      ...ejemplo,
      datos: ejemplo.datos.map((aviso) => ({
        ...aviso,
        fechaPublicacion: expect.stringMatching(FECHA_ISO_BOLIVIA),
      })),
    });
    // Más recientes primero.
    const fechas = respuesta.body.datos.map((aviso) => aviso.fechaPublicacion);
    expect(fechas).toEqual([...fechas].sort().reverse());
  });

  it('devuelve todas las vigentes de la sede, con las fechas en -04:00', async () => {
    const respuesta = await request(app).get(SEDE);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.paginacion).toEqual({
      pagina: 1,
      porPagina: 10,
      total: 6,
      totalPaginas: 1,
    });
    for (const publicacion of respuesta.body.datos) {
      expect(publicacion.fechaPublicacion).toMatch(FECHA_ISO_BOLIVIA);
    }
  });

  it('filtra por categoría, por destacada y por varios tipos', async () => {
    const porCategoria = await request(app).get(`${SEDE}?categoria=sacramentos`);
    const destacadas = await request(app).get(`${SEDE}?destacada=true`);
    const noDestacadas = await request(app).get(`${SEDE}?destacada=false&tipo=AVISO`);

    expect(porCategoria.body.datos.map((p) => p.slug)).toEqual(['primeras-comuniones-42-ninos']);
    expect(destacadas.body).toEqual({
      datos: [],
      paginacion: { pagina: 1, porPagina: 10, total: 0, totalPaginas: 0 },
    });
    expect(noDestacadas.body.paginacion.total).toBe(3);
  });

  it('busca en título y resumen sin distinguir mayúsculas ni acentos', async () => {
    const sinAcento = await request(app).get(`${SEDE}?buscar=COMUNION`);
    const conAcento = await request(app).get(`${SEDE}?buscar=vicaría`);
    const enResumen = await request(app).get(`${SEDE}?buscar=jornada`);

    expect(sinAcento.body.datos.map((p) => p.id)).toEqual([4]);
    expect(conAcento.body.datos.map((p) => p.id)).toEqual([5]);
    expect(enResumen.body.datos.map((p) => p.id).sort()).toEqual([4, 5]);
  });

  it('busca los comodines de LIKE como texto, no como patrón', async () => {
    const respuesta = await request(app).get(`${SEDE}?buscar=%25%25`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toEqual([]);
  });

  it('ordena de la más antigua a la más reciente con orden=fechaPublicacion', async () => {
    const respuesta = await request(app).get(`${SEDE}?orden=fechaPublicacion&porPagina=2`);

    expect(respuesta.body.datos.map((p) => p.id)).toEqual([5, 4]);
  });

  it('pagina el resultado y no falla con una página fuera de rango', async () => {
    const segunda = await request(app).get(`${SEDE}?porPagina=2&pagina=2`);
    const fuera = await request(app).get(`${SEDE}?pagina=9`);

    expect(segunda.body.datos).toHaveLength(2);
    expect(segunda.body.paginacion).toEqual({ pagina: 2, porPagina: 2, total: 6, totalPaginas: 3 });
    expect(fuera.status).toBe(200);
    expect(fuera.body).toEqual({
      datos: [],
      paginacion: { pagina: 9, porPagina: 10, total: 6, totalPaginas: 1 },
    });
  });

  it('responde 400 con todos los errores de la query juntos', async () => {
    const respuesta = await request(app).get(
      `${SEDE}?porPagina=51&tipo=BLOG&destacada=si&buscar=a&orden=titulo`,
    );

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles.map((detalle) => detalle.campo).sort()).toEqual([
      'query.buscar',
      'query.destacada',
      'query.orden',
      'query.porPagina',
      'query.tipo.0',
    ]);
  });

  it('responde 404 para una sede inexistente', async () => {
    const respuesta = await request(app).get('/api/sedes/no-existe/publicaciones');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('solo muestra las publicaciones vigentes (publicadas, ya iniciadas y sin expirar)', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}?porPagina=50`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.map((p) => p.slug).sort()).toEqual(VIGENTES.map(slugDe).sort());
    expect(respuesta.body.paginacion.total).toBe(VIGENTES.length);
  });

  it('responde la lista de una sede sin publicaciones con datos vacíos', async () => {
    const respuesta = await request(app).get(
      '/api/sedes/capilla-san-pablo-de-la-cruz/publicaciones',
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      datos: [],
      paginacion: { pagina: 1, porPagina: 10, total: 0, totalPaginas: 0 },
    });
  });
});

describe('GET /api/sedes/:sede/publicaciones/:slug', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}/primeras-comuniones-42-ninos`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(
      ejemploDelContrato('## `GET /api/sedes/:sede/publicaciones/:slug`'),
    );
  });

  it.each(VIGENTES)('devuelve la publicación vigente «%s»', async (caso) => {
    const respuesta = await request(app).get(`${TEMPORAL}/${slugDe(caso)}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.slug).toBe(slugDe(caso));
    expect(respuesta.body.datos.contenido).toEqual({
      formato: 'blocknote',
      version: 1,
      bloques: [],
    });
  });

  it.each(Object.keys(CASOS).filter((caso) => !VIGENTES.includes(caso)))(
    'responde 404 para una publicación «%s», sin revelar que existe',
    async (caso) => {
      const respuesta = await request(app).get(`${TEMPORAL}/${slugDe(caso)}`);

      expect(respuesta.status).toBe(404);
      expect(respuesta.body.error).toEqual({
        codigo: 'NO_ENCONTRADO',
        mensaje: `No existe la publicación «${slugDe(caso)}».`,
        detalles: [],
      });
    },
  );

  it('responde 404 para un slug inexistente, de otra sede o con formato imposible', async () => {
    const inexistente = await request(app).get(`${SEDE}/no-existe`);
    const otraSede = await request(app).get(`${TEMPORAL}/primeras-comuniones-42-ninos`);
    const imposible = await request(app).get(`${SEDE}/Primeras-Comuniones`);

    expect(inexistente.status).toBe(404);
    expect(otraSede.status).toBe(404);
    expect(imposible.status).toBe(404);
  });
});

describe('GET /api/categorias y /api/categorias-evento', () => {
  it('categorías de publicaciones coinciden con el contrato', async () => {
    const respuesta = await request(app).get('/api/categorias');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/categorias`'));
  });

  it('categorías de eventos coinciden con el contrato', async () => {
    const respuesta = await request(app).get('/api/categorias-evento');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/categorias-evento`'));
  });
});
