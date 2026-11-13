// Próximos eventos (RF-09). Las fechas del seed son relativas a su carga y envejecen, así que las
// reglas se prueban con eventos temporales de «resurreccion» (sin eventos en el seed).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

const app = createApp();
const TEMPORAL = '/api/sedes/resurreccion/eventos';
const TZ = "'America/La_Paz'";

const sufijo = randomUUID().replaceAll('-', '').slice(0, 8);
const titulo = (caso) => `Prueba ${sufijo} ${caso}`;
// Hoy a la hora indicada, en hora de Bolivia.
const hoyA = (hora) => `(((now() AT TIME ZONE ${TZ})::date + time '${hora}') AT TIME ZONE ${TZ})`;

// caso -> [estado, categoría, inicio, fin, todoElDia, imagen (url) o null]
const CASOS = {
  'terminado-hace-dos-dias': [
    'Publicado',
    'Liturgia',
    "now() - interval '2 days'",
    'NULL',
    false,
    null,
  ],
  'hoy-ya-empezo': ['Publicado', 'Liturgia', hoyA('00:01'), 'NULL', false, null],
  'fin-ya-paso': [
    'Publicado',
    'Comunidad',
    "now() - interval '3 hours'",
    "now() - interval '1 hour'",
    false,
    null,
  ],
  'varios-dias-en-curso': [
    'Publicado',
    'Catequesis',
    "now() - interval '2 days'",
    "now() + interval '2 days'",
    false,
    null,
  ],
  'borrador-futuro': ['Borrador', 'Liturgia', "now() + interval '1 day'", 'NULL', false, null],
  'archivado-futuro': ['Archivado', 'Liturgia', "now() + interval '1 day'", 'NULL', false, null],
  'todo-el-dia': [
    'Publicado',
    'Solemnidad',
    "now() + interval '3 days'",
    'NULL',
    true,
    '/media/seed/altar.webp',
  ],
  'en-30-dias': ['Publicado', 'Solemnidad', "now() + interval '30 days'", 'NULL', false, null],
};

// Los que el portal debe mostrar, en orden de fecha de inicio.
const PROXIMOS = ['varios-dias-en-curso', 'hoy-ya-empezo', 'todo-el-dia', 'en-30-dias'].map(titulo);

const titulos = (respuesta) => respuesta.body.datos.map((evento) => evento.titulo);
const diaBolivia = async (desplazamientoDias) =>
  (
    await consultar(
      `SELECT to_char((now() AT TIME ZONE ${TZ})::date + $1::int, 'YYYY-MM-DD') AS dia`,
      [desplazamientoDias],
    )
  ).rows[0].dia;

beforeAll(async () => {
  for (const [caso, [estado, categoria, inicio, fin, todoElDia, imagen]] of Object.entries(CASOS)) {
    await consultar(
      `INSERT INTO evento (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, imagen_id, titulo, lugar, fecha_inicio, fecha_fin, todo_el_dia)
       VALUES ((SELECT id FROM sede WHERE slug = 'resurreccion'),
               (SELECT id FROM categoria_evento WHERE nombre = $1),
               (SELECT id FROM estado_publicacion WHERE nombre = $2),
               (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
               (SELECT id FROM archivo_multimedia WHERE url = $3),
               $4, 'Templo parroquial', ${inicio}, ${fin}, $5)`,
      [categoria, estado, imagen, titulo(caso), todoElDia],
    );
  }
});

afterAll(async () => {
  await consultar('DELETE FROM evento WHERE titulo LIKE $1', [`Prueba ${sufijo} %`]);
  await cerrarPool();
});

describe('GET /api/sedes/:sede/eventos con el seed', () => {
  it('cada evento tiene exactamente los campos del ejemplo del contrato, en orden cronológico', async () => {
    const [ejemplo] = ejemploDelContrato('## `GET /api/sedes/:sede/eventos`').datos;
    const respuesta = await request(app).get(
      '/api/sedes/senor-de-la-exaltacion/eventos?porPagina=50',
    );

    expect(respuesta.status).toBe(200);
    const inicios = respuesta.body.datos.map((evento) => evento.fechaInicio);
    expect(inicios).toEqual([...inicios].sort());
    for (const evento of respuesta.body.datos) {
      expect(Object.keys(evento)).toEqual(Object.keys(ejemplo));
      expect(evento.fechaInicio).toMatch(/-04:00$/);
      expect(evento.categoria).toEqual({
        id: expect.any(Number),
        nombre: expect.any(String),
        colorHex: expect.stringMatching(/^#[0-9A-F]{6}$/),
      });
    }
    expect(respuesta.body.paginacion.total).toBe(respuesta.body.datos.length);
  });
});

describe('GET /api/sedes/:sede/eventos: próximos eventos (RF-09)', () => {
  it('muestra solo los publicados que no han terminado, por fecha de inicio', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}?porPagina=50`);

    expect(respuesta.status).toBe(200);
    expect(titulos(respuesta)).toEqual(PROXIMOS);
    expect(respuesta.body.paginacion).toEqual({
      pagina: 1,
      porPagina: 50,
      total: PROXIMOS.length,
      totalPaginas: 1,
    });
  });

  it('un evento sin hora de fin sigue visible durante todo su día, aunque ya haya empezado', async () => {
    const respuesta = await request(app).get(TEMPORAL);

    expect(titulos(respuesta)).toContain(titulo('hoy-ya-empezo'));
  });

  it('un evento de varios días ya iniciado sigue en el calendario hasta que termina', async () => {
    const respuesta = await request(app).get(TEMPORAL);

    expect(titulos(respuesta)).toContain(titulo('varios-dias-en-curso'));
  });

  it('devuelve los eventos de todo el día con su imagen estándar y sin hora de fin', async () => {
    const respuesta = await request(app).get(TEMPORAL);
    const evento = respuesta.body.datos.find((e) => e.titulo === titulo('todo-el-dia'));

    expect(evento).toMatchObject({
      todoElDia: true,
      fechaFin: null,
      lugar: 'Templo parroquial',
      descripcion: null,
      categoria: { nombre: 'Solemnidad', colorHex: '#9E1B22' },
      imagen: {
        id: 3,
        url: '/media/seed/altar.webp',
        ancho: 1879,
        alto: 1057,
        textoAlternativo: expect.stringContaining('Altar del templo'),
      },
    });
    expect(evento.fechaInicio).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/);
  });

  it('filtra por categoría (ids separados por comas)', async () => {
    const { rows } = await consultar("SELECT id FROM categoria_evento WHERE nombre = 'Solemnidad'");
    const respuesta = await request(app).get(`${TEMPORAL}?categoria=${rows[0].id}`);

    expect(titulos(respuesta)).toEqual([titulo('todo-el-dia'), titulo('en-30-dias')]);
  });

  it('filtra por hasta: excluye lo que empieza después', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}?hasta=${await diaBolivia(7)}`);

    expect(titulos(respuesta)).toEqual(PROXIMOS.slice(0, 3));
  });

  it('filtra por desde y hasta: un evento de varios días entra si se cruza con el rango', async () => {
    const manana = await diaBolivia(1);
    const cruzando = await request(app).get(`${TEMPORAL}?desde=${manana}&hasta=${manana}`);
    const lejano = await request(app).get(
      `${TEMPORAL}?desde=${await diaBolivia(10)}&hasta=${await diaBolivia(40)}`,
    );

    expect(titulos(cruzando)).toEqual([titulo('varios-dias-en-curso')]);
    expect(titulos(lejano)).toEqual([titulo('en-30-dias')]);
  });

  it('un desde anterior a hoy se trata como hoy: nunca muestra eventos pasados', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}?desde=2020-01-01&porPagina=50`);

    expect(titulos(respuesta)).toEqual(PROXIMOS);
  });

  it('pagina el resultado y responde una página fuera de rango sin error', async () => {
    const primera = await request(app).get(`${TEMPORAL}?porPagina=2`);
    const fuera = await request(app).get(`${TEMPORAL}?porPagina=2&pagina=5`);

    expect(titulos(primera)).toEqual(PROXIMOS.slice(0, 2));
    expect(primera.body.paginacion).toEqual({ pagina: 1, porPagina: 2, total: 4, totalPaginas: 2 });
    expect(fuera.status).toBe(200);
    expect(fuera.body).toEqual({
      datos: [],
      paginacion: { pagina: 5, porPagina: 2, total: 4, totalPaginas: 2 },
    });
  });

  it('responde 400 si hasta es anterior a desde', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}?desde=2026-11-19&hasta=2026-11-12`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'query.hasta', mensaje: 'Debe ser igual o posterior a desde.' },
    ]);
  });

  it('responde 400 con los errores de formato juntos', async () => {
    const respuesta = await request(app).get(`${TEMPORAL}?desde=ayer&categoria=x&porPagina=0`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((detalle) => detalle.campo).sort()).toEqual([
      'query.categoria.0',
      'query.desde',
      'query.porPagina',
    ]);
  });

  it('responde 404 para una sede inexistente y lista vacía para una sede sin eventos', async () => {
    const inexistente = await request(app).get('/api/sedes/no-existe/eventos');
    const sinEventos = await request(app).get('/api/sedes/capilla-san-pablo-de-la-cruz/eventos');

    expect(inexistente.status).toBe(404);
    expect(sinEventos.status).toBe(200);
    expect(sinEventos.body.datos).toEqual([]);
  });
});
