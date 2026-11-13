// Consultas de videos de YouTube (SQL parametrizado).
import { consultar } from '../db/index.js';

// Videos de una sede: primero los destacados, luego por orden.
export async function listar(sedeId) {
  const { rows } = await consultar(
    `SELECT id, titulo, descripcion, youtube_video_id, duracion_segundos, destacado, orden,
            fecha_publicacion
       FROM video
      WHERE sede_id = $1
      ORDER BY destacado DESC, orden, id`,
    [sedeId],
  );
  return rows;
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

export async function listarAdmin({ sedeSlug, sedeId, destacado } = {}, db = { consultar }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  if (sedeId !== undefined) condiciones.push(`v.sede_id = ${agregar(sedeId)}`);
  if (destacado !== undefined) condiciones.push(`v.destacado = ${agregar(destacado)}`);

  const { rows } = await db.consultar(
    `SELECT ${COLUMNAS_ADMIN}
     ${UNIONES_ADMIN}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY v.destacado DESC, v.orden, v.id`,
    parametros,
  );
  return rows;
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
