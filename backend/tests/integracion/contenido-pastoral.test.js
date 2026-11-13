// Servicios, grupos pastorales y videos contra el seed real.
// Lo que el seed no tiene (videos, un servicio oculto, un grupo con imagen) se crea en filas
// temporales de la sede «resurreccion» y se borra al terminar.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

const app = createApp();
const SEDE = '/api/sedes/senor-de-la-exaltacion';
const TEMPORAL = '/api/sedes/resurreccion';

const sufijo = randomUUID().replaceAll('-', '').slice(0, 6);
const VIDEO_DESTACADO = `prDest${sufijo}`.slice(0, 11);
const VIDEO_COMUN = `prComu${sufijo}`.slice(0, 11);
const SLUG_OCULTO = `servicio-oculto-${sufijo}`;
const GRUPO_CON_IMAGEN = `Grupo de prueba ${sufijo}`;

beforeAll(async () => {
  const resurreccion = "(SELECT id FROM sede WHERE slug = 'resurreccion')";

  // El video común tiene un orden menor, pero el destacado debe salir primero.
  await consultar(
    `INSERT INTO video (sede_id, titulo, descripcion, youtube_video_id, duracion_segundos, destacado, orden, fecha_publicacion)
     VALUES (${resurreccion}, 'Video común', NULL, $1, NULL, false, 1, NULL),
            (${resurreccion}, 'Video destacado', 'Recorrido por el templo', $2, 30, true, 5, '2026-10-15')`,
    [VIDEO_COMUN, VIDEO_DESTACADO],
  );
  await consultar(
    `INSERT INTO servicio (sede_id, slug, nombre, descripcion_corta, contenido, visible)
     VALUES (${resurreccion}, $1, 'Servicio oculto', 'No se publica', '{"datos": []}', false)`,
    [SLUG_OCULTO],
  );
  await consultar(
    `INSERT INTO grupo_pastoral (sede_id, imagen_id, nombre, icono, orden)
     VALUES (${resurreccion}, (SELECT id FROM archivo_multimedia WHERE url = '/media/seed/altar.webp'), $1, 'users', 1)`,
    [GRUPO_CON_IMAGEN],
  );
});

afterAll(async () => {
  await consultar('DELETE FROM video WHERE youtube_video_id IN ($1, $2)', [
    VIDEO_COMUN,
    VIDEO_DESTACADO,
  ]);
  await consultar('DELETE FROM servicio WHERE slug = $1', [SLUG_OCULTO]);
  await consultar('DELETE FROM grupo_pastoral WHERE nombre = $1', [GRUPO_CON_IMAGEN]);
  await cerrarPool();
});

describe('GET /api/sedes/:sede/servicios', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}/servicios`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/sedes/:sede/servicios`'));
  });

  it('no incluye los servicios ocultos', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/servicios`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ datos: [] });
  });
});

describe('GET /api/sedes/:sede/servicios/:slug', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}/servicios/bautismo`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/sedes/:sede/servicios/:slug`'));
  });

  it('devuelve el contenido sin traducir y una lista vacía si no hay preguntas', async () => {
    const respuesta = await request(app).get(`${SEDE}/servicios/primera-comunion`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.preguntasFrecuentes).toEqual([]);
    expect(respuesta.body.datos.contenido.datos[0]).toEqual({
      etiqueta: 'Duración',
      valor: 'Catequesis de dos años',
    });
  });

  it.each([
    ['inexistente', `${SEDE}/servicios/no-existe`, 'no-existe'],
    ['oculto', () => `${TEMPORAL}/servicios/${SLUG_OCULTO}`, () => SLUG_OCULTO],
    ['de otra sede', `${TEMPORAL}/servicios/bautismo`, 'bautismo'],
    ['con formato imposible', `${SEDE}/servicios/Bautismo`, 'Bautismo'],
  ])('responde 404 para un servicio %s', async (_caso, ruta, slug) => {
    const respuesta = await request(app).get(typeof ruta === 'function' ? ruta() : ruta);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: `No existe el servicio «${typeof slug === 'function' ? slug() : slug}».`,
        detalles: [],
      },
    });
  });
});

describe('GET /api/sedes/:sede/grupos-pastorales', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}/grupos-pastorales`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(
      ejemploDelContrato('## `GET /api/sedes/:sede/grupos-pastorales`'),
    );
  });

  it('devuelve la imagen del grupo con el objeto imagen estándar', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/grupos-pastorales`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toEqual([
      {
        id: expect.any(Number),
        nombre: GRUPO_CON_IMAGEN,
        descripcion: null,
        horarioReunion: null,
        contacto: null,
        icono: 'users',
        imagen: {
          id: 3,
          url: '/media/seed/altar.webp',
          textoAlternativo:
            'Altar del templo parroquial adornado con flores rojas y blancas, con un tríptico de icono al lado derecho',
          ancho: 1879,
          alto: 1057,
        },
        orden: 1,
      },
    ]);
  });
});

describe('GET /api/sedes/:sede/videos', () => {
  it('responde una lista vacía con el seed (no hay videos propios)', async () => {
    const respuesta = await request(app).get(`${SEDE}/videos`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ datos: [] });
  });

  it('ordena primero los destacados y arma las URL de YouTube', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}/videos`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toEqual([
      {
        id: expect.any(Number),
        titulo: 'Video destacado',
        descripcion: 'Recorrido por el templo',
        youtubeVideoId: VIDEO_DESTACADO,
        urlVideo: `https://www.youtube.com/watch?v=${VIDEO_DESTACADO}`,
        urlInsercion: `https://www.youtube-nocookie.com/embed/${VIDEO_DESTACADO}`,
        urlMiniatura: `https://i.ytimg.com/vi/${VIDEO_DESTACADO}/hqdefault.jpg`,
        duracionSegundos: 30,
        destacado: true,
        orden: 5,
        fechaPublicacion: '2026-10-15',
      },
      expect.objectContaining({
        titulo: 'Video común',
        youtubeVideoId: VIDEO_COMUN,
        duracionSegundos: null,
        destacado: false,
        fechaPublicacion: null,
      }),
    ]);
  });

  it('tiene en cada video exactamente los campos del ejemplo del contrato', async () => {
    const [ejemplo] = ejemploDelContrato('## `GET /api/sedes/:sede/videos`').datos;
    const respuesta = await request(app).get(`${TEMPORAL}/videos`);

    for (const video of respuesta.body.datos) {
      expect(Object.keys(video)).toEqual(Object.keys(ejemplo));
    }
  });
});
