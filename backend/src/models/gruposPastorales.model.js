// Consultas de grupos pastorales (SQL parametrizado).
import { consultar } from '../db/index.js';

// Grupos visibles de una sede, por orden, con su imagen (si tiene) en la misma consulta.
export async function listarVisibles(sedeId) {
  const { rows } = await consultar(
    `SELECT g.id,
            g.nombre,
            g.descripcion,
            g.horario_reunion,
            g.contacto,
            g.icono,
            g.orden,
            am.id AS imagen_id,
            am.url AS imagen_url,
            am.texto_alternativo AS imagen_texto_alternativo,
            am.ancho_px AS imagen_ancho,
            am.alto_px AS imagen_alto
       FROM grupo_pastoral g
       LEFT JOIN archivo_multimedia am ON am.id = g.imagen_id
      WHERE g.sede_id = $1 AND g.visible
      ORDER BY g.orden, g.id`,
    [sedeId],
  );
  return rows;
}
