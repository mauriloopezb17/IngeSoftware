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
