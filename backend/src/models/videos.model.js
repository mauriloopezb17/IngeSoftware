// Consultas de videos de YouTube (SQL parametrizado).
import { consultar } from '../db/index.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';

const ORDENES_VIDEO = {
  orden: 'destacado DESC, orden ASC, id ASC',
  '-orden': 'destacado DESC, orden DESC, id DESC',
  fechaPublicacion: 'fecha_publicacion ASC NULLS LAST, id ASC',
  '-fechaPublicacion': 'fecha_publicacion DESC NULLS LAST, id DESC',
  titulo: 'titulo ASC, id ASC',
  '-titulo': 'titulo DESC, id DESC',
};

// Videos de una sede: paginados y ordenados según lista blanca.
export async function listar(
  sedeId,
  { destacado, buscar, orden = 'orden', limite = null, desplazamiento = 0 } = {},
) {
  const parametros = [sedeId];
  const condiciones = ['sede_id = $1'];
  if (destacado !== undefined) condiciones.push(`destacado = $${parametros.push(destacado)}`);
  if (buscar) {
    const p = `$${parametros.push(patronBusqueda(buscar))}`;
    condiciones.push(
      `(${sinAcentosSql('titulo')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql("coalesce(descripcion, '')")} LIKE ${p} ESCAPE '\\')`,
    );
  }
  const donde = condiciones.join(' AND ');
  const clausulaOrden = ORDENES_VIDEO[orden] ?? ORDENES_VIDEO.orden;

  const selectBase = `SELECT id, titulo, descripcion, youtube_video_id, duracion_segundos, destacado, orden, fecha_publicacion FROM video WHERE ${donde}`;

  if (limite === null) {
    const { rows } = await consultar(`${selectBase} ORDER BY ${clausulaOrden}`, parametros);
    return { filas: rows, total: rows.length };
  }

  const [pagina, conteo] = await Promise.all([
    consultar(
      `${selectBase} ORDER BY ${clausulaOrden} LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM video WHERE ${donde}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

const COLUMNAS_ADMIN = `
  v.id,
  v.titulo,
  v.descripcion,
  v.youtube_video_id,
  v.duracion_segundos,
  v.destacado,
  v.orden,
  v.fecha_publicacion,
  s.id     AS sede_id,
  s.nombre AS sede_nombre,
  s.slug   AS sede_slug`;

const UNIONES_ADMIN = `
  FROM video v
  JOIN sede s ON s.id = v.sede_id`;

const ORDENES_VIDEO_ADMIN = {
  orden: 'v.destacado DESC, v.orden ASC, v.id ASC',
  '-orden': 'v.destacado DESC, v.orden DESC, v.id DESC',
  fechaPublicacion: 'v.fecha_publicacion ASC NULLS LAST, v.id ASC',
  '-fechaPublicacion': 'v.fecha_publicacion DESC NULLS LAST, v.id DESC',
  titulo: 'v.titulo ASC, v.id ASC',
  '-titulo': 'v.titulo DESC, v.id DESC',
};

export async function listarAdmin(
  { sedeSlug, sedeId, destacado, buscar, orden = 'orden', limite = null, desplazamiento = 0 } = {},
  db = { consultar },
) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  if (sedeId !== undefined) condiciones.push(`v.sede_id = ${agregar(sedeId)}`);
  if (destacado !== undefined) condiciones.push(`v.destacado = ${agregar(destacado)}`);
  if (buscar) {
    const p = agregar(patronBusqueda(buscar));
    condiciones.push(
      `(${sinAcentosSql('v.titulo')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql("coalesce(v.descripcion, '')")} LIKE ${p} ESCAPE '\\')`,
    );
  }

  const donde = condiciones.join(' AND ');
  const clausulaOrden = ORDENES_VIDEO_ADMIN[orden] ?? ORDENES_VIDEO_ADMIN.orden;

  if (limite === null) {
    const { rows } = await db.consultar(
      `SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE ${donde} ORDER BY ${clausulaOrden}`,
      parametros,
    );
    return { filas: rows, total: rows.length };
  }

  const [pagina, conteo] = await Promise.all([
    db.consultar(
      `SELECT ${COLUMNAS_ADMIN}
       ${UNIONES_ADMIN}
       WHERE ${donde}
       ORDER BY ${clausulaOrden}
       LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    db.consultar(`SELECT count(*)::int AS total ${UNIONES_ADMIN} WHERE ${donde}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE v.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM video WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function crear(
  { sedeId, youtubeVideoId, titulo, descripcion, duracionSegundos, destacado, fechaPublicacion },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO video
       (sede_id, youtube_video_id, titulo, descripcion, duracion_segundos, destacado, orden, fecha_publicacion)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       COALESCE((SELECT MAX(orden) FROM video WHERE sede_id = $1), 0) + 1,
       $7
     )
     RETURNING *`,
    [sedeId, youtubeVideoId, titulo, descripcion, duracionSegundos, destacado, fechaPublicacion],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  youtubeVideoId: 'youtube_video_id',
  titulo: 'titulo',
  descripcion: 'descripcion',
  duracionSegundos: 'duracion_segundos',
  destacado: 'destacado',
  fechaPublicacion: 'fecha_publicacion',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const entradas = Object.entries(cambios).filter(
    ([clave, valor]) => clave in COLUMNAS_ACTUALIZABLES && valor !== undefined,
  );
  if (entradas.length === 0) return filaParaModificar(id, db);

  const asignaciones = entradas.map(
    ([clave], indice) => `${COLUMNAS_ACTUALIZABLES[clave]} = $${indice + 2}`,
  );
  const valores = entradas.map(([, valor]) => valor);

  const { rows } = await db.consultar(
    `UPDATE video SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...valores],
  );
  return rows[0];
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM video WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}
