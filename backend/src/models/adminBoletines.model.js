// Consultas de boletines del panel (SQL parametrizado).
import { consultar } from '../db/index.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';

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
  am.tamano_bytes AS archivo_tamano_bytes,
  pt.id AS portada_id,
  pt.url AS portada_url,
  pt.texto_alternativo AS portada_texto_alternativo,
  pt.ancho_px AS portada_ancho,
  pt.alto_px AS portada_alto`;

const UNIONES = `
  FROM boletin b
  JOIN sede s ON s.id = b.sede_id
  JOIN usuario u ON u.id = b.publicado_por
  JOIN archivo_multimedia am ON am.id = b.archivo_id
  LEFT JOIN archivo_multimedia pt ON pt.id = b.portada_id`;

const ORDENES = Object.freeze({
  periodo: 'b.periodo ASC, b.id ASC',
  '-periodo': 'b.periodo DESC, b.id DESC',
  fechaPublicacion: 'b.fecha_publicacion ASC, b.id ASC',
  '-fechaPublicacion': 'b.fecha_publicacion DESC, b.id DESC',
});

// filtros: { sedeSlug?, anio?, buscar? } (buscar: en el título, sin mayúsculas ni acentos).
export async function listar(filtros, { orden, limite, desplazamiento }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  if (filtros.sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(filtros.sedeSlug)}`);
  if (filtros.anio !== undefined) {
    condiciones.push(`extract(year FROM b.periodo) = ${agregar(filtros.anio)}`);
  }
  if (filtros.buscar) {
    condiciones.push(
      `${sinAcentosSql('b.titulo')} LIKE ${agregar(patronBusqueda(filtros.buscar))} ESCAPE '\\'`,
    );
  }
  const donde = condiciones.join(' AND ');
  const orderBy = ORDENES[orden] ?? ORDENES['-periodo'];

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS} ${UNIONES}
        WHERE ${donde}
        ORDER BY ${orderBy}
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
    `INSERT INTO boletin (sede_id, archivo_id, portada_id, publicado_por, titulo, periodo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      datos.sedeId,
      datos.archivoId,
      datos.portadaId ?? null,
      datos.publicadoPor,
      datos.titulo,
      datos.periodo,
    ],
  );
  return rows[0];
}
