// Pruebas de integración del buscador del portal (PAR-170.1 y 170.3, migración 014).
import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';

vi.stubEnv('CACHE_HABILITADA', 'true');

const { createApp } = await import('../../src/app.js');
const { establecerLogger, reiniciarLogger, crearLogger } =
  await import('../../src/config/logger.js');
const { cerrarPool, consultar, transaccion } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
app.set('trust proxy', 1);
const panel = crearPanel(app);
const { como, usuarios } = panel;

const PREFIJO = `Busq${Date.now()}`;
const TOKEN_UNICO = `tok${Date.now()}`;
let sede;
let sedeAjena;

const ids = {
  publicaciones: [],
  eventos: [],
  servicios: [],
  grupos: [],
  boletines: [],
  paginas: [],
  proclamas: [],
  archivos: [],
};

const bloqueParrafo = (texto) => ({
  id: randomUUID(),
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text: texto, styles: {} }],
  children: [],
});

const docBlockNote = (texto) => ({
  formato: 'blocknote',
  version: 1,
  bloques: [bloqueParrafo(texto)],
});

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });

  const [{ rows: estados }, { rows: tiposPub }, { rows: catsEv }] = await Promise.all([
    consultar('SELECT id, nombre FROM estado_publicacion'),
    consultar('SELECT id, nombre FROM tipo_publicacion'),
    consultar('SELECT id FROM categoria_evento LIMIT 1'),
  ]);
  const estadoId = Object.fromEntries(estados.map((r) => [r.nombre, r.id]));
  const tipoPubId = Object.fromEntries(tiposPub.map((r) => [r.nombre, r.id]));
  const catEventoId = catsEv[0].id;

  const archivoPdf = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'application/pdf',
    clave: `sedes/${sede.slug}/2026/11/${randomUUID()}.pdf`,
  });
  ids.archivos.push(archivoPdf.id);

  // 1. Noticia publicada (con tildes y stemming)
  const { rows: not1 } = await consultar(
    `INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, resumen, contenido, fecha_publicacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, TIMESTAMPTZ '2026-10-10 10:00:00-04:00')
     RETURNING id`,
    [
      sede.id,
      tipoPubId.Noticia,
      estadoId.Publicado,
      usuarios.secretaria.id,
      `${PREFIJO} Bautízo en la Exaltación`,
      `${PREFIJO.toLowerCase()}-bautizo`,
      `Celebración de bautizos comunitarios ${TOKEN_UNICO} con alegría.`,
      JSON.stringify(docBlockNote(`Preparación de catequesis ${TOKEN_UNICO} para familias.`)),
    ],
  );
  ids.publicaciones.push(not1[0].id);

  // Nota de prensa publicada (más reciente, con frase exacta y término excluible)
  const { rows: not2 } = await consultar(
    `INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, resumen, contenido, fecha_publicacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, TIMESTAMPTZ '2026-11-15 10:00:00-04:00')
     RETURNING id`,
    [
      sede.id,
      tipoPubId['Nota de prensa'],
      estadoId.Publicado,
      usuarios.secretaria.id,
      `${PREFIJO} Encuentro coral juvenil`,
      `${PREFIJO.toLowerCase()}-coral`,
      `Jornada de cantos ${TOKEN_UNICO} con frase exacta misioneros pasionistas.`,
      JSON.stringify(docBlockNote(`Sin término restringido ${TOKEN_UNICO}.`)),
    ],
  );
  ids.publicaciones.push(not2[0].id);

  // Borrador, noticia vencida y aviso interno (NO deben aparecer)
  const { rows: pubOcultas } = await consultar(
    `INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, resumen, contenido, fecha_publicacion, fecha_expiracion)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now() - interval '1 day', NULL),
       ($1, $2, $9, $4, $10, $11, $7, $8::jsonb, now() - interval '10 days', now() - interval '1 day'),
       ($1, $12, $9, $4, $13, $14, $7, $8::jsonb, now() - interval '1 day', NULL)
     RETURNING id`,
    [
      sede.id,
      tipoPubId.Noticia,
      estadoId.Borrador,
      usuarios.secretaria.id,
      `${PREFIJO} Borrador secreto`,
      `${PREFIJO.toLowerCase()}-borrador`,
      `Texto ${TOKEN_UNICO} que no debe salir.`,
      JSON.stringify(docBlockNote(`Contenido ${TOKEN_UNICO}`)),
      estadoId.Publicado,
      `${PREFIJO} Vencida secreta`,
      `${PREFIJO.toLowerCase()}-vencida`,
      tipoPubId.Aviso,
      `${PREFIJO} Aviso interno`,
      `${PREFIJO.toLowerCase()}-aviso`,
    ],
  );
  ids.publicaciones.push(...pubOcultas.map((r) => r.id));

  // 2. Evento publicado
  const { rows: ev1 } = await consultar(
    `INSERT INTO evento (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, titulo, descripcion, lugar, fecha_inicio, detalle)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TIMESTAMPTZ '2026-12-01 18:00:00-04:00', $8::jsonb)
     RETURNING id`,
    [
      sede.id,
      catEventoId,
      estadoId.Publicado,
      usuarios.secretaria.id,
      `${PREFIJO} Vigilia ${TOKEN_UNICO}`,
      'Vigilia parroquial con cancelado excluible.',
      'Templo Obrajes',
      JSON.stringify({ contenido: docBlockNote(`Detalles de la vigilia ${TOKEN_UNICO}`) }),
    ],
  );
  ids.eventos.push(ev1[0].id);

  // 3. Servicio / Sacramento visible
  const { rows: srv1 } = await consultar(
    `INSERT INTO servicio (sede_id, nombre, slug, descripcion_corta, contenido, visible)
     VALUES ($1, $2, $3, $4, '[]'::jsonb, true)
     RETURNING id`,
    [
      sede.id,
      `${PREFIJO} Bautismo`,
      `${PREFIJO.toLowerCase()}-bautismo`,
      `Preparación para el sacramento ${TOKEN_UNICO}.`,
    ],
  );
  ids.servicios.push(srv1[0].id);

  // 4. Grupo visible y grupo oculto
  const { rows: grpRows } = await consultar(
    `INSERT INTO grupo_pastoral (sede_id, nombre, slug, descripcion, visible)
     VALUES
       ($1, $2, $3, $4, true),
       ($1, $5, $6, $4, false)
     RETURNING id`,
    [
      sede.id,
      `${PREFIJO} Coro ${TOKEN_UNICO}`,
      `${PREFIJO.toLowerCase()}-coro`,
      `Grupo musical ${TOKEN_UNICO}.`,
      `${PREFIJO} Grupo oculto ${TOKEN_UNICO}`,
      `${PREFIJO.toLowerCase()}-grupo-oculto`,
    ],
  );
  ids.grupos.push(...grpRows.map((r) => r.id));

  // 5. Boletín publicado
  const { rows: bol1 } = await consultar(
    `INSERT INTO boletin (sede_id, titulo, periodo, archivo_id, publicado_por, fecha_publicacion)
     VALUES ($1, $2, DATE '2026-09-01', $3, $4, TIMESTAMPTZ '2026-09-05 09:00:00-04:00')
     RETURNING id`,
    [sede.id, `${PREFIJO} Boletín ${TOKEN_UNICO}`, archivoPdf.id, usuarios.secretaria.id],
  );
  ids.boletines.push(bol1[0].id);

  // 6. Página publicada
  const { rows: pag1 } = await consultar(
    `INSERT INTO pagina (sede_id, estado_publicacion_id, creado_por, slug, titulo, descripcion_seo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      sede.id,
      estadoId.Publicado,
      usuarios.secretaria.id,
      `${PREFIJO.toLowerCase()}-historia`,
      `${PREFIJO} Historia ${TOKEN_UNICO}`,
      `Página informativa ${TOKEN_UNICO}.`,
    ],
  );
  ids.paginas.push(pag1[0].id);

  // 7. Proclama con el mismo token (NUNCA debe aparecer en búsqueda)
  const { rows: proc1 } = await consultar(
    `INSERT INTO proclama (sede_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio)
     VALUES ($1, $2, 'Novia Busq', now() + interval '30 days')
     RETURNING id`,
    [sede.id, `${PREFIJO} Proclama ${TOKEN_UNICO}`],
  );
  ids.proclamas.push(proc1[0].id);
});

afterAll(async () => {
  await panel.limpiar(async () => {
    if (ids.proclamas.length) {
      await consultar('DELETE FROM proclama WHERE id = ANY($1::int[])', [ids.proclamas]);
    }
    if (ids.paginas.length) {
      await consultar('DELETE FROM pagina WHERE id = ANY($1::int[])', [ids.paginas]);
    }
    if (ids.boletines.length) {
      await consultar('DELETE FROM boletin WHERE id = ANY($1::int[])', [ids.boletines]);
    }
    if (ids.grupos.length) {
      await consultar('DELETE FROM grupo_pastoral WHERE id = ANY($1::int[])', [ids.grupos]);
    }
    if (ids.servicios.length) {
      await consultar('DELETE FROM servicio WHERE id = ANY($1::int[])', [ids.servicios]);
    }
    if (ids.eventos.length) {
      await consultar('DELETE FROM evento WHERE id = ANY($1::int[])', [ids.eventos]);
    }
    if (ids.publicaciones.length) {
      await consultar('DELETE FROM publicacion WHERE id = ANY($1::int[])', [ids.publicaciones]);
    }
  });
  reiniciarLogger();
  await cerrarPool();
  await cerrarRedis();
});

const RUTA = (slug = sede.slug) => `/api/sedes/${slug}/buscar`;

describe('buscador del portal (PAR-170)', () => {
  it('encuentra todos los tipos públicos, omite borradores/vencidas/avisos/ocultos/proclamas y arma totalesPorTipo y segmentos sin HTML', async () => {
    const res = await como().get(`${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&porPagina=30`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    expect(res.body.totalesPorTipo).toEqual({
      noticia: 2,
      evento: 1,
      sacramento: 1,
      grupo: 1,
      boletin: 1,
      pagina: 1,
    });
    expect(res.body.paginacion.total).toBe(7);

    const titulos = res.body.datos.map((d) => d.titulo);
    expect(titulos.some((t) => t.includes('Borrador secreto'))).toBe(false);
    expect(titulos.some((t) => t.includes('Vencida secreta'))).toBe(false);
    expect(titulos.some((t) => t.includes('Aviso interno'))).toBe(false);
    expect(titulos.some((t) => t.includes('Grupo oculto'))).toBe(false);
    expect(titulos.some((t) => t.includes('Proclama'))).toBe(false);

    for (const item of res.body.datos) {
      expect(Array.isArray(item.fragmento)).toBe(true);
      expect(item.fragmento.length).toBeGreaterThan(0);
      for (const seg of item.fragmento) {
        expect(typeof seg.texto).toBe('string');
        expect(typeof seg.resaltado).toBe('boolean');
        expect(seg.texto).not.toMatch(/<\/?mark>|<\/?b>/i);
      }
    }
    expect(res.body.datos.some((d) => d.fragmento.some((s) => s.resaltado))).toBe(true);
  });

  it('busca sin tildes ni mayúsculas, con stemming, frase exacta y exclusión (-)', async () => {
    // Sin tildes ni mayúsculas ("bautizo" encuentra "Bautízo", "exaltacion" encuentra "Exaltación")
    const sinTildes = await como().get(
      `${RUTA()}?q=${encodeURIComponent(`${PREFIJO} bautizo exaltacion`)}`,
    );
    expect(sinTildes.status).toBe(200);
    expect(sinTildes.body.datos.some((d) => d.titulo.includes('Bautízo en la Exaltación'))).toBe(
      true,
    );

    // Plurales / stemming en español ("bautizos" encuentra "Bautízo")
    const plural = await como().get(`${RUTA()}?q=${encodeURIComponent(`${PREFIJO} bautizos`)}`);
    expect(plural.status).toBe(200);
    expect(plural.body.datos.some((d) => d.titulo.includes('Bautízo en la Exaltación'))).toBe(true);

    // Frase exacta
    const frase = await como().get(
      `${RUTA()}?q=${encodeURIComponent(`${TOKEN_UNICO} "misioneros pasionistas"`)}`,
    );
    expect(frase.status).toBe(200);
    expect(frase.body.paginacion.total).toBe(1);
    expect(frase.body.datos[0].tipo).toBe('noticia');

    // Exclusión con -
    const exclusion = await como().get(
      `${RUTA()}?q=${encodeURIComponent(`${TOKEN_UNICO} -cancelado`)}`,
    );
    expect(exclusion.status).toBe(200);
    expect(exclusion.body.totalesPorTipo.evento).toBe(0);
    expect(exclusion.body.totalesPorTipo.noticia).toBe(2);
  });

  it('aplica filtros tipo, desde/hasta, los tres órdenes y paginación', async () => {
    // Filtro por tipo manteniendo totalesPorTipo
    const porTipo = await como().get(
      `${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&tipo=noticia,boletin`,
    );
    expect(porTipo.status).toBe(200);
    expect(porTipo.body.paginacion.total).toBe(3);
    expect(porTipo.body.datos.every((d) => d.tipo === 'noticia' || d.tipo === 'boletin')).toBe(
      true,
    );
    expect(porTipo.body.totalesPorTipo.evento).toBe(1);

    // Filtro desde/hasta (zona Bolivia)
    const rango = await como().get(
      `${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&desde=2026-11-01&hasta=2026-11-30`,
    );
    expect(rango.status).toBe(200);
    expect(rango.body.paginacion.total).toBe(1);
    expect(rango.body.datos[0].titulo).toContain('Encuentro coral juvenil');

    // Orden reciente vs antiguo
    const reciente = await como().get(
      `${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&tipo=noticia,boletin,evento&orden=reciente`,
    );
    const antiguo = await como().get(
      `${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&tipo=noticia,boletin,evento&orden=antiguo`,
    );
    expect(reciente.status).toBe(200);
    expect(antiguo.status).toBe(200);
    const fechasRec = reciente.body.datos.map((d) => d.fecha);
    const fechasAnt = antiguo.body.datos.map((d) => d.fecha);
    expect(fechasRec).toEqual([...fechasRec].sort().reverse());
    expect(fechasAnt).toEqual([...fechasAnt].sort());

    // Paginación: página 2 y página fuera de rango
    const pag2 = await como().get(
      `${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&pagina=2&porPagina=3`,
    );
    expect(pag2.status).toBe(200);
    expect(pag2.body.datos).toHaveLength(3);
    expect(pag2.body.paginacion).toEqual({
      pagina: 2,
      porPagina: 3,
      total: 7,
      totalPaginas: 3,
    });

    const fueraRango = await como().get(
      `${RUTA()}?q=${encodeURIComponent(TOKEN_UNICO)}&pagina=99&porPagina=3`,
    );
    expect(fueraRango.status).toBe(200);
    expect(fueraRango.body.datos).toEqual([]);
    expect(fueraRango.body.paginacion.total).toBe(7);

    // Sede inexistente -> 404; otra sede -> no devuelve resultados de la sede principal
    expect((await como().get(`${RUTA('sede-no-existe')}?q=bautismo`)).status).toBe(404);
    const otraSede = await como().get(
      `${RUTA(sedeAjena.slug)}?q=${encodeURIComponent(TOKEN_UNICO)}`,
    );
    expect(otraSede.status).toBe(200);
    expect(otraSede.body.paginacion.total).toBe(0);
  });

  it('usa índices GIN en el plan de ejecución de PostgreSQL (EXPLAIN)', async () => {
    const plan = await transaccion(async (db) => {
      await db.consultar('SET LOCAL enable_seqscan = off');
      const { rows } = await db.consultar(
        `EXPLAIN (FORMAT TEXT)
         SELECT id FROM publicacion
          WHERE (
              setweight(to_tsvector('es_sin_tildes', coalesce(titulo, '')), 'A') ||
              setweight(to_tsvector('es_sin_tildes', coalesce(resumen, '')), 'B') ||
              setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(contenido), '')), 'C')
            ) @@ websearch_to_tsquery('es_sin_tildes', $1)`,
        [TOKEN_UNICO],
      );
      return rows.map((r) => r['QUERY PLAN']).join('\n');
    });
    expect(plan).toMatch(/publicacion_busqueda_gin_idx|Bitmap Index Scan/i);
  });

  const CASOS_VALIDACION = [
    { nombre: 'sin q', query: '', campo: 'query.q' },
    { nombre: 'q de 1 carácter', query: 'q=a', campo: 'query.q' },
    { nombre: 'q de 101 caracteres', query: `q=${'a'.repeat(101)}`, campo: 'query.q' },
    { nombre: 'q como arreglo', query: 'q=uno&q=dos', campo: 'query.q' },
    { nombre: 'q con carácter de control', query: 'q=hola%00mundo', campo: 'query.q' },
    { nombre: 'tipo inválido', query: 'q=bautismo&tipo=proclama', campo: 'query.tipo' },
    { nombre: 'desde inválido', query: 'q=bautismo&desde=2026-02-30', campo: 'query.desde' },
    {
      nombre: 'hasta anterior a desde',
      query: 'q=bautismo&desde=2026-11-10&hasta=2026-11-01',
      campo: 'query.hasta',
    },
    { nombre: 'orden inválido', query: 'q=bautismo&orden=titulo', campo: 'query.orden' },
    { nombre: 'porPagina > 30', query: 'q=bautismo&porPagina=31', campo: 'query.porPagina' },
    { nombre: 'parámetro desconocido', query: 'q=bautismo&extra=no', campo: 'query.extra' },
  ];

  it.each(CASOS_VALIDACION)(
    'rechaza parámetro inválido ($nombre) con 400 en $campo',
    async ({ query, campo }) => {
      const res = await como().get(`${RUTA()}?${query}`);
      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe('VALIDACION');
      expect(
        res.body.error.detalles.some((d) => d.campo === campo || d.campo.startsWith(`${campo}.`)),
      ).toBe(true);
      expect(JSON.stringify(res.body)).not.toMatch(/\bSELECT\b|pg_|node_modules/i);
    },
  );

  it.each(["' OR '1'='1", '100%', 'a_b', 'a\\b', '"comilla sin cerrar'])(
    'maneja entrada especial %s de forma segura sin 500 ni fugas SQL',
    async (entrada) => {
      const res = await como().get(
        `${RUTA()}?q=${encodeURIComponent(`${TOKEN_UNICO} ${entrada}`)}`,
      );
      expect([200, 400]).toContain(res.status);
      expect(JSON.stringify(res.body)).not.toMatch(/\bSELECT\b|pg_|node_modules/i);
    },
  );

  it('cachea en Redis, invalida al publicar contenido nuevo, registra consulta en log y limita a 30/min por IP', async () => {
    const lineas = [];
    const destino = new Writable({
      write(chunk, _enc, cb) {
        lineas.push(chunk.toString());
        cb();
      },
    });
    establecerLogger(createLoggerWrapper(destino));
    const appConLog = createApp();
    appConLog.set('trust proxy', 1);

    try {
      const urlCache = `${RUTA()}?q=${encodeURIComponent(`${TOKEN_UNICO} cacheado`)}`;

      // Crear una noticia nueva para que aparezca luego de invalidar
      const primera = await request(appConLog).get(urlCache).set('X-Forwarded-For', '10.20.30.1');
      expect(primera.status).toBe(200);
      expect(primera.headers['x-cache']).toBe('MISS');
      expect(primera.body.paginacion.total).toBe(0);

      const segunda = await request(appConLog).get(urlCache).set('X-Forwarded-For', '10.20.30.1');
      expect(segunda.status).toBe(200);
      expect(segunda.headers['x-cache']).toBe('HIT');

      // Publicar una noticia nueva desde el panel invalida la búsqueda
      const creada = await como('admin').post('/api/admin/publicaciones', {
        sedeId: sede.id,
        tipo: 'NOTICIA',
        titulo: `${PREFIJO} Noticia cacheado ${TOKEN_UNICO}`,
        resumen: `Resumen cacheado ${TOKEN_UNICO}.`,
        contenido: docBlockNote(`Cuerpo cacheado ${TOKEN_UNICO}.`),
        fechaPublicacion: '2026-10-01T10:00:00-04:00',
      });
      expect(creada.status, JSON.stringify(creada.body)).toBe(201);
      ids.publicaciones.push(creada.body.datos.id);

      const envRes = await como('admin').post(
        `/api/admin/publicaciones/${creada.body.datos.id}/enviar-revision`,
        {},
      );
      expect(envRes.status).toBe(200);

      const pubRes = await como('admin').post(
        `/api/admin/publicaciones/${creada.body.datos.id}/aprobar`,
        {},
      );
      expect(pubRes.status).toBe(200);

      const tercera = await request(appConLog).get(urlCache).set('X-Forwarded-For', '10.20.30.1');
      expect(tercera.status).toBe(200);
      expect(tercera.headers['x-cache']).toBe('MISS');
      expect(tercera.body.paginacion.total).toBe(1);

      // Verificar log de consulta
      const logsBusqueda = lineas
        .map((l) => JSON.parse(l))
        .filter((l) => l.evento === 'consulta' && l.tipo === 'busqueda');
      expect(logsBusqueda.length).toBeGreaterThanOrEqual(3);
      expect(logsBusqueda.some((l) => l.cache === true)).toBe(true);
      expect(logsBusqueda[0].filtros?.q).toContain('cacheado');
      expect(typeof logsBusqueda[0].total).toBe('number');
    } finally {
      vi.unstubAllEnvs();
      reiniciarLogger();
    }

    // Límite de 30 búsquedas por minuto por IP
    const ipLimite = '10.20.30.99';
    for (let i = 0; i < 30; i++) {
      const ok = await request(app).get(`${RUTA()}?q=bautismo`).set('X-Forwarded-For', ipLimite);
      expect(ok.status).toBe(200);
    }
    const bloqueada = await request(app)
      .get(`${RUTA()}?q=bautismo`)
      .set('X-Forwarded-For', ipLimite);
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(bloqueada.headers['retry-after']).toBeDefined();
  });
});

function createLoggerWrapper(destino) {
  return crearLogger(undefined, { destino, nivel: 'info' });
}
