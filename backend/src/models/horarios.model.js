// Consultas de horarios (SQL parametrizado).
import { consultar } from '../db/index.js';

// Horarios activos de una sede con su tipo, ya ordenados para agruparlos:
// por tipo (id), día, hora de inicio, hora de fin y descripción.
// tipoIds: lista de ids de tipo_horario para filtrar, o null para todos.
export async function listarActivos(sedeId, tipoIds = null) {
  const { rows } = await consultar(
    `SELECT th.id AS tipo_id,
            th.nombre AS tipo_nombre,
            h.dia_semana,
            h.hora_inicio,
            h.hora_fin,
            h.descripcion
       FROM horario h
       JOIN tipo_horario th ON th.id = h.tipo_horario_id
      WHERE h.sede_id = $1
        AND h.activo
        AND ($2::int[] IS NULL OR th.id = ANY($2::int[]))
      ORDER BY th.id, h.dia_semana, h.hora_inicio, h.hora_fin NULLS FIRST, h.descripcion NULLS FIRST`,
    [sedeId, tipoIds],
  );
  return rows;
}
