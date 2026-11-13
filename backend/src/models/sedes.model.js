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

const COLUMNAS_ADMIN = `
  ${COLUMNAS_RESUMEN},
  s.telefono,
  s.whatsapp,
  s.correo,
  s.latitud::float8 AS latitud,
  s.longitud::float8 AS longitud,
  s.activo,
  COALESCE(
    (SELECT json_agg(
              json_build_object('id', rs.id, 'nombre', rs.nombre, 'icono', rs.icono, 'url', srs.url)
              ORDER BY rs.id)
       FROM sede_red_social srs
       JOIN red_social rs ON rs.id = srs.red_social_id
      WHERE srs.sede_id = s.id),
    '[]'::json
  ) AS redes_sociales`;

// Lista sedes para el panel CMS (sin paginar): parroquias primero, luego por id.
export async function listarAdmin({ tipoPrimero, sedeId } = {}, db = { consultar }) {
  const parametros = [tipoPrimero];
  const condiciones = ['TRUE'];
  if (sedeId !== undefined) {
    parametros.push(sedeId);
    condiciones.push(`s.id = $${parametros.length}`);
  }

  const { rows } = await db.consultar(
    `SELECT ${COLUMNAS_ADMIN}
     FROM sede s ${UNIONES_RESUMEN}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY (ts.nombre = $1) DESC, s.id`,
    parametros,
  );
  return rows;
}

export async function buscarDetalleAdminPorId(sedeId, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT ${COLUMNAS_ADMIN}
     FROM sede s ${UNIONES_RESUMEN}
     WHERE s.id = $1`,
    [sedeId],
  );
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM sede WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function obtenerTipoSedeIdPorNombre(nombre, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM tipo_sede WHERE nombre = $1', [nombre]);
  return rows[0]?.id ?? null;
}

export async function redesExistentes(ids, db = { consultar }) {
  if (ids.length === 0) return [];
  const { rows } = await db.consultar('SELECT id FROM red_social WHERE id = ANY($1::int[])', [ids]);
  return rows.map((r) => r.id);
}

export async function obtenerRedesDeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT red_social_id, url FROM sede_red_social WHERE sede_id = $1 ORDER BY red_social_id',
    [sedeId],
  );
  return rows;
}

export async function reemplazarRedesDeSede(sedeId, redes, db = { consultar }) {
  await db.consultar('DELETE FROM sede_red_social WHERE sede_id = $1', [sedeId]);
  if (redes.length === 0) return [];

  const valores = [];
  const placeholders = redes.map((red, indice) => {
    const base = indice * 3;
    valores.push(sedeId, red.redSocialId, red.url);
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });

  const { rows } = await db.consultar(
    `INSERT INTO sede_red_social (sede_id, red_social_id, url)
     VALUES ${placeholders.join(', ')}
     RETURNING red_social_id, url`,
    valores,
  );
  return rows;
}

export async function crear(
  {
    tipoSedeId,
    sedePadreId,
    nombre,
    slug,
    direccion,
    telefono,
    whatsapp,
    correo,
    latitud,
    longitud,
    urlImagenPortada,
    configuracion,
    activo,
  },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO sede (
       tipo_sede_id, sede_padre_id, nombre, slug, direccion, telefono, whatsapp,
       correo, latitud, longitud, url_imagen_portada, configuracion, activo
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
     RETURNING *`,
    [
      tipoSedeId,
      sedePadreId,
      nombre,
      slug,
      direccion,
      telefono,
      whatsapp,
      correo,
      latitud,
      longitud,
      urlImagenPortada,
      JSON.stringify(configuracion),
      activo,
    ],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  tipoSedeId: 'tipo_sede_id',
  sedePadreId: 'sede_padre_id',
  nombre: 'nombre',
  slug: 'slug',
  direccion: 'direccion',
  telefono: 'telefono',
  whatsapp: 'whatsapp',
  correo: 'correo',
  latitud: 'latitud',
  longitud: 'longitud',
  urlImagenPortada: 'url_imagen_portada',
  activo: 'activo',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const asignaciones = [];
  const valores = [id];

  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined) continue;
    if (clave === 'configuracion') {
      valores.push(JSON.stringify(valor));
      asignaciones.push(`configuracion = $${valores.length}::jsonb`);
    } else if (clave in COLUMNAS_ACTUALIZABLES) {
      valores.push(valor);
      asignaciones.push(`${COLUMNAS_ACTUALIZABLES[clave]} = $${valores.length}`);
    }
  }

  if (asignaciones.length === 0) return filaParaModificar(id, db);

  const { rows } = await db.consultar(
    `UPDATE sede SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    valores,
  );
  return rows[0];
}
