// Consultas de servicios y sacramentos (SQL parametrizado).
import { consultar } from '../db/index.js';

const COLUMNAS = 's.id, s.slug, s.nombre, s.descripcion_corta, s.icono, s.orden';

// Servicios visibles de una sede, por orden.
export async function listarVisibles(sedeId) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS}
       FROM servicio s
      WHERE s.sede_id = $1 AND s.visible
      ORDER BY s.orden, s.id`,
    [sedeId],
  );
  return rows;
}

// Servicio visible por slug, con su contenido y sus preguntas frecuentes activas (misma consulta).
export async function obtenerVisiblePorSlug(sedeId, slug) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS},
            s.contenido,
            COALESCE(
              (SELECT json_agg(
                        json_build_object('id', pf.id, 'pregunta', pf.pregunta, 'respuesta', pf.respuesta)
                        ORDER BY pf.orden, pf.id)
                 FROM pregunta_frecuente pf
                WHERE pf.servicio_id = s.id AND pf.activa),
              '[]'::json
            ) AS preguntas_frecuentes
       FROM servicio s
      WHERE s.sede_id = $1 AND s.slug = $2 AND s.visible`,
    [sedeId, slug],
  );
  return rows[0] ?? null;
}
