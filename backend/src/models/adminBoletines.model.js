// Consultas de boletines del panel (SQL parametrizado).
import { consultar } from '../db/index.js';

const COLUMNAS = `
  b.id,
  b.sede_id,
  s.nombre AS sede_nombre,
  s.slug AS sede_slug,
  b.titulo,
  b.periodo,
  b.fecha_publicacion,
  b.publicado_por,
  u.nombre_completo AS publicado_por_nombre,
  am.id AS archivo_id,
  am.url AS archivo_url,
  am.nombre_original AS archivo_nombre_original,
  am.tipo_mime AS archivo_tipo_mime,
  am.tamano_bytes AS archivo_tamano_bytes`;

const UNIONES = `
  FROM boletin b
  JOIN sede s ON s.id = b.sede_id
  JOIN usuario u ON u.id = b.publicado_por
  JOIN archivo_multimedia am ON am.id = b.archivo_id`;

// filtros: { sedeSlug?, anio? }. Del periodo más reciente al más antiguo.
export async function listar(filtros, { limite, desplazamiento }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  if (filtros.sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(filtros.sedeSlug)}`);
  if (filtros.anio !== undefined) {
    condiciones.push(`extract(year FROM b.periodo) = ${agregar(filtros.anio)}`);
  }
  const donde = condiciones.join(' AND ');

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS} ${UNIONES}
        WHERE ${donde}
        ORDER BY b.periodo DESC, b.id DESC
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total ${UNIONES} WHERE ${donde}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS} ${UNIONES} WHERE b.id = $1`, [id]);
  return rows[0];
}

export async function insertar(datos, db) {
  const { rows } = await db.consultar(
    `INSERT INTO boletin (sede_id, archivo_id, publicado_por, titulo, periodo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [datos.sedeId, datos.archivoId, datos.publicadoPor, datos.titulo, datos.periodo],
  );
  return rows[0];
}
