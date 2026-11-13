// Consultas de sedes (SQL parametrizado). Devuelven filas en snake_case; el armado de la
// respuesta del contrato lo hace services/sedes.service.js.
import { consultar } from '../db/index.js';

// Columnas comunes del resumen de una sede, con su tipo, su sede padre y su imagen de portada.
// La portada se guarda como URL (sede.url_imagen_portada); si coincide con un archivo de la
// biblioteca, se completan su id, sus dimensiones y su texto alternativo.
const COLUMNAS_RESUMEN = `
  s.id,
  s.nombre,
  s.slug,
  ts.nombre AS tipo_nombre,
  CASE WHEN p.id IS NULL THEN NULL
       ELSE json_build_object('id', p.id, 'nombre', p.nombre, 'slug', p.slug)
  END AS sede_padre,
  s.direccion,
  s.url_imagen_portada,
  am.id AS imagen_id,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px AS imagen_alto,
  s.configuracion`;

const UNIONES_RESUMEN = `
  JOIN tipo_sede ts ON ts.id = s.tipo_sede_id
  LEFT JOIN sede p ON p.id = s.sede_padre_id
  LEFT JOIN archivo_multimedia am ON am.url = s.url_imagen_portada`;

// Sedes activas: primero las del tipo indicado (parroquias) y dentro de cada tipo por id.
export async function listarActivas({ tipoPrimero }) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS_RESUMEN}
     FROM sede s ${UNIONES_RESUMEN}
     WHERE s.activo
     ORDER BY (ts.nombre = $1) DESC, s.id`,
    [tipoPrimero],
  );
  return rows;
}

// { id, slug, nombre } de la sede activa con ese slug, o null.
export async function buscarActivaPorSlug(slug) {
  const { rows } = await consultar('SELECT id, slug, nombre FROM sede WHERE slug = $1 AND activo', [
    slug,
  ]);
  return rows[0] ?? null;
}

// Detalle de una sede: resumen, contacto, ubicación y redes sociales (en la misma consulta).
export async function obtenerDetalle(sedeId) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS_RESUMEN},
       s.telefono,
       s.whatsapp,
       s.correo,
       s.latitud::float8 AS latitud,
       s.longitud::float8 AS longitud,
       COALESCE(
         (SELECT json_agg(
                   json_build_object('nombre', rs.nombre, 'icono', rs.icono, 'url', srs.url)
                   ORDER BY rs.id)
            FROM sede_red_social srs
            JOIN red_social rs ON rs.id = srs.red_social_id
           WHERE srs.sede_id = s.id),
         '[]'::json
       ) AS redes_sociales
     FROM sede s ${UNIONES_RESUMEN}
     WHERE s.id = $1`,
    [sedeId],
  );
  return rows[0] ?? null;
}
