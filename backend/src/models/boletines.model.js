// Consultas de boletines parroquiales (SQL parametrizado).
import { consultar } from '../db/index.js';

const COLUMNAS = `
  b.id,
  b.titulo,
  b.periodo,
  b.fecha_publicacion,
  am.id AS archivo_id,
  am.url AS archivo_url,
  am.nombre_original AS archivo_nombre_original,
  am.tipo_mime AS archivo_tipo_mime,
  am.tamano_bytes AS archivo_tamano_bytes`;

// Boletines ya publicados de una sede (fecha_publicacion <= now()), del periodo más reciente al
// más antiguo. anio (opcional) filtra por el año del periodo.
export async function listarPublicados(sedeId, { anio, limite, desplazamiento }) {
  const parametros = [sedeId];
  const condiciones = ['b.sede_id = $1', 'b.fecha_publicacion <= now()'];
  if (anio) condiciones.push(`extract(year FROM b.periodo) = $${parametros.push(anio)}`);
  const donde = condiciones.join(' AND ');

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS}
         FROM boletin b
         JOIN archivo_multimedia am ON am.id = b.archivo_id
        WHERE ${donde}
        ORDER BY b.periodo DESC, b.id DESC
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM boletin b WHERE ${donde}`, parametros),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}
