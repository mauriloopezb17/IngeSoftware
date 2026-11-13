// Consultas de archivo_multimedia para la subida (SQL parametrizado).
// La biblioteca (listar, editar, eliminar, usos) está en biblioteca.model.js.
import { consultar } from '../db/index.js';

// Sede activa por id (para validar el sedeId que manda el Administrador).
export async function buscarSedeActiva(sedeId) {
  const { rows } = await consultar('SELECT id, slug FROM sede WHERE id = $1 AND activo', [sedeId]);
  return rows[0];
}

// Bytes que ocupan todos los archivos (sin las variantes).
export async function sumarTamanos() {
  const { rows } = await consultar(
    // SUM de bigint es numeric (llegaría como texto): se devuelve bigint para que sea un número.
    'SELECT COALESCE(SUM(tamano_bytes), 0)::bigint AS total FROM archivo_multimedia',
  );
  return rows[0].total;
}

// Columnas y uniones de un archivo con su sede y quien lo subió (alias: m, s, u). Cada consulta
// agrega su columna "en_uso" (la biblioteca la calcula; al subir un archivo nuevo es false).
export const COLUMNAS_ARCHIVO = `
  m.id,
  m.url,
  m.nombre_original,
  m.tipo_mime,
  m.tamano_bytes,
  m.ancho_px,
  m.alto_px,
  m.texto_alternativo,
  m.fecha_subida,
  s.id     AS sede_id,
  s.nombre AS sede_nombre,
  s.slug   AS sede_slug,
  u.id     AS subido_por_id,
  u.nombre_completo AS subido_por_nombre`;

export const UNIONES_ARCHIVO = `
  FROM archivo_multimedia m
  JOIN sede s ON s.id = m.sede_id
  JOIN usuario u ON u.id = m.subido_por`;

// Inserta el archivo. "url" guarda la clave del objeto en el bucket. "db" permite hacerlo en la
// misma transacción que la bitácora. Devuelve { fila } (la de la tabla, para la bitácora) y
// { archivo } (con su sede y quien lo subió, para la respuesta).
export async function insertar(
  {
    sedeId,
    subidoPor,
    nombreOriginal,
    clave,
    tipoMime,
    tamanoBytes,
    anchoPx,
    altoPx,
    textoAlternativo,
  },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO archivo_multimedia
       (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      sedeId,
      subidoPor,
      nombreOriginal,
      clave,
      tipoMime,
      tamanoBytes,
      anchoPx,
      altoPx,
      textoAlternativo,
    ],
  );

  const { rows: archivo } = await db.consultar(
    `SELECT ${COLUMNAS_ARCHIVO}, false AS en_uso ${UNIONES_ARCHIVO} WHERE m.id = $1`,
    [rows[0].id],
  );
  return { fila: rows[0], archivo: archivo[0] };
}
