// Consultas de búsqueda de texto completo en PostgreSQL (OLA-2.md §2, migración 014).
import { consultar } from '../db/index.js';
import { ESTADOS_PUBLICACION, TIPOS_PUBLICACION } from '../constantes/catalogos.js';

const ZONA_HORARIA = 'America/La_Paz';

// Expresiones tsvector idénticas a los índices GIN de 014_busqueda_texto_completo.sql.
const VECTOR_PUBLICACION = `(
  setweight(to_tsvector('es_sin_tildes', coalesce(p.titulo, '')), 'A') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(p.resumen, '')), 'B') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(p.contenido), '')), 'C')
)`;

const VECTOR_EVENTO = `(
  setweight(to_tsvector('es_sin_tildes', coalesce(e.titulo, '')), 'A') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(e.descripcion, '')), 'B') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(e.lugar, '')), 'B') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(e.detalle->'contenido'), '')), 'C')
)`;

const VECTOR_SERVICIO = `(
  setweight(to_tsvector('es_sin_tildes', coalesce(s.nombre, '')), 'A') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(s.descripcion_corta, '')), 'B')
)`;

const VECTOR_GRUPO = `(
  setweight(to_tsvector('es_sin_tildes', coalesce(g.nombre, '')), 'A') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(g.descripcion, '')), 'B') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(g.detalle->'contenido'), '')), 'C')
)`;

const VECTOR_BOLETIN = `(
  setweight(to_tsvector('es_sin_tildes', coalesce(b.titulo, '')), 'A')
)`;

const VECTOR_PAGINA = `(
  setweight(to_tsvector('es_sin_tildes', coalesce(pg.titulo, '')), 'A') ||
  setweight(to_tsvector('es_sin_tildes', coalesce(pg.descripcion_seo, '')), 'B')
)`;

const ORDENES = Object.freeze({
  relevancia: 'f.relevancia DESC, f.fecha DESC NULLS LAST, f.id DESC',
  reciente: 'f.fecha DESC NULLS LAST, f.relevancia DESC, f.id DESC',
  antiguo: 'f.fecha ASC NULLS LAST, f.relevancia DESC, f.id ASC',
});

const OPCIONES_FRAGMENTO =
  "E'StartSel=\\x02, StopSel=\\x03, MaxWords=25, MinWords=10, ShortWord=2, HighlightAll=false, MaxFragments=2, FragmentDelimiter= … '";

export async function buscarEnContenido(
  sedeId,
  { q, tipo, desde, hasta, orden = 'relevancia', limite = 10, desplazamiento = 0 },
) {
  const estadoPublicado = ESTADOS_PUBLICACION.nombreDe('PUBLICADO');
  const tiposPublicacion = [
    TIPOS_PUBLICACION.nombreDe('NOTICIA'),
    TIPOS_PUBLICACION.nombreDe('NOTA_DE_PRENSA'),
  ];

  const parametros = [sedeId, q, estadoPublicado, tiposPublicacion];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  const filtrosFecha = [];
  if (desde) {
    filtrosFecha.push(
      `fecha IS NOT NULL AND fecha >= (${agregar(desde)}::date::timestamp AT TIME ZONE '${ZONA_HORARIA}')`,
    );
  }
  if (hasta) {
    filtrosFecha.push(
      `fecha IS NOT NULL AND fecha < ((${agregar(hasta)}::date + 1)::timestamp AT TIME ZONE '${ZONA_HORARIA}')`,
    );
  }
  const dondeFecha = filtrosFecha.length ? `WHERE ${filtrosFecha.join(' AND ')}` : '';
  const dondeTipo = tipo?.length ? `WHERE tipo = ANY(${agregar(tipo)}::text[])` : '';

  const pLimite = agregar(limite);
  const pDesplazamiento = agregar(desplazamiento);
  const clausulaOrden = ORDENES[orden] ?? ORDENES.relevancia;

  const sql = `
    WITH consulta AS (
      SELECT websearch_to_tsquery('es_sin_tildes', $2) AS q
    ),
    universo AS (
      SELECT 'noticia'::text AS tipo,
             p.id,
             p.titulo,
             '/noticias/' || p.slug AS url,
             p.fecha_publicacion AS fecha,
             p.imagen_portada_id AS imagen_id,
             coalesce(nullif(p.resumen, ''), nullif(extraer_texto_blocknote(p.contenido), ''), p.titulo) AS texto_resumen,
             ts_rank_cd(${VECTOR_PUBLICACION}, consulta.q) AS relevancia
        FROM publicacion p
        JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id
        JOIN tipo_publicacion tp ON tp.id = p.tipo_publicacion_id
        CROSS JOIN consulta
       WHERE p.sede_id = $1
         AND ep.nombre = $3
         AND tp.nombre = ANY($4::text[])
         AND p.fecha_publicacion <= now()
         AND (p.fecha_expiracion IS NULL OR p.fecha_expiracion > now())
         AND ${VECTOR_PUBLICACION} @@ consulta.q

      UNION ALL

      SELECT 'evento'::text AS tipo,
             e.id,
             e.titulo,
             '/calendario/' || e.id AS url,
             e.fecha_inicio AS fecha,
             e.imagen_id,
             coalesce(
               nullif(e.descripcion, ''),
               nullif(e.lugar, ''),
               nullif(extraer_texto_blocknote(e.detalle->'contenido'), ''),
               e.titulo
             ) AS texto_resumen,
             ts_rank_cd(${VECTOR_EVENTO}, consulta.q) AS relevancia
        FROM evento e
        JOIN estado_publicacion ep ON ep.id = e.estado_publicacion_id
        CROSS JOIN consulta
       WHERE e.sede_id = $1
         AND ep.nombre = $3
         AND ${VECTOR_EVENTO} @@ consulta.q

      UNION ALL

      SELECT 'sacramento'::text AS tipo,
             s.id,
             s.nombre AS titulo,
             '/sacramentos/' || s.slug AS url,
             NULL::timestamptz AS fecha,
             NULL::int AS imagen_id,
             coalesce(nullif(s.descripcion_corta, ''), s.nombre) AS texto_resumen,
             ts_rank_cd(${VECTOR_SERVICIO}, consulta.q) AS relevancia
        FROM servicio s
        CROSS JOIN consulta
       WHERE s.sede_id = $1
         AND s.visible
         AND ${VECTOR_SERVICIO} @@ consulta.q

      UNION ALL

      SELECT 'grupo'::text AS tipo,
             g.id,
             g.nombre AS titulo,
             '/comunidad/grupos/' || g.slug AS url,
             NULL::timestamptz AS fecha,
             g.imagen_id,
             coalesce(
               nullif(g.descripcion, ''),
               nullif(extraer_texto_blocknote(g.detalle->'contenido'), ''),
               g.nombre
             ) AS texto_resumen,
             ts_rank_cd(${VECTOR_GRUPO}, consulta.q) AS relevancia
        FROM grupo_pastoral g
        CROSS JOIN consulta
       WHERE g.sede_id = $1
         AND g.visible
         AND ${VECTOR_GRUPO} @@ consulta.q

      UNION ALL

      SELECT 'boletin'::text AS tipo,
             b.id,
             b.titulo,
             '/boletines/' || to_char(b.periodo, 'YYYY-MM') AS url,
             b.fecha_publicacion AS fecha,
             b.portada_id AS imagen_id,
             b.titulo AS texto_resumen,
             ts_rank_cd(${VECTOR_BOLETIN}, consulta.q) AS relevancia
        FROM boletin b
        CROSS JOIN consulta
       WHERE b.sede_id = $1
         AND b.fecha_publicacion <= now()
         AND ${VECTOR_BOLETIN} @@ consulta.q

      UNION ALL

      SELECT 'pagina'::text AS tipo,
             pg.id,
             pg.titulo,
             '/paginas/' || pg.slug AS url,
             NULL::timestamptz AS fecha,
             NULL::int AS imagen_id,
             coalesce(nullif(pg.descripcion_seo, ''), pg.titulo) AS texto_resumen,
             ts_rank_cd(${VECTOR_PAGINA}, consulta.q) AS relevancia
        FROM pagina pg
        JOIN estado_publicacion ep ON ep.id = pg.estado_publicacion_id
        CROSS JOIN consulta
       WHERE pg.sede_id = $1
         AND ep.nombre = $3
         AND ${VECTOR_PAGINA} @@ consulta.q
    ),
    con_fechas AS (
      SELECT * FROM universo ${dondeFecha}
    ),
    totales AS (
      SELECT tipo, count(*)::int AS total FROM con_fechas GROUP BY tipo
    ),
    filtrados AS (
      SELECT * FROM con_fechas ${dondeTipo}
    ),
    conteo AS (
      SELECT count(*)::int AS total FROM filtrados
    ),
    pagina AS (
      SELECT f.tipo,
             f.id,
             f.titulo,
             f.url,
             f.fecha,
             ts_headline('es_sin_tildes', f.texto_resumen, consulta.q, ${OPCIONES_FRAGMENTO}) AS fragmento_crudo,
             f.texto_resumen,
             am.id AS imagen_id,
             am.url AS imagen_url,
             am.texto_alternativo AS imagen_texto_alternativo,
             am.ancho_px AS imagen_ancho,
             am.alto_px AS imagen_alto
        FROM filtrados f
        CROSS JOIN consulta
        LEFT JOIN archivo_multimedia am ON am.id = f.imagen_id
       ORDER BY ${clausulaOrden}
       LIMIT ${pLimite} OFFSET ${pDesplazamiento}
    )
    SELECT
      (SELECT coalesce(json_agg(json_build_object('tipo', tipo, 'total', total)), '[]'::json) FROM totales) AS totales,
      (SELECT total FROM conteo) AS total,
      (SELECT coalesce(json_agg(row_to_json(p)), '[]'::json) FROM pagina p) AS filas
  `;

  const { rows } = await consultar(sql, parametros);
  return rows[0];
}
