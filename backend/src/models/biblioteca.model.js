// Consultas de la biblioteca multimedia: listar, ver, editar, eliminar y ver dónde se usa un archivo.
import { consultar } from '../db/index.js';
import { sinAcentosSql } from '../utils/busqueda.js';
import { COLUMNAS_ARCHIVO, UNIONES_ARCHIVO } from './multimedia.model.js';

// Identificador único (uuid) de la clave del objeto; NULL en los archivos del seed y de URL fija.
// El contenido JSON de publicaciones, servicios y bloques se busca por él: así también se detecta
// el uso de una variante (<uuid>-480w.webp). Contrato: admin.md, "Cuándo un archivo está en uso".
const UUID_DE_LA_CLAVE =
  "substring(m.url from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')";

// Lugares donde se usa el archivo "m" (una fila por uso): orden del detalle, tipo y nombre.
const USOS = `
  SELECT 1 AS orden, 'PORTADA_PUBLICACION' AS tipo, p.titulo AS nombre
    FROM publicacion p WHERE p.imagen_portada_id = m.id
  UNION ALL
  SELECT 2, 'IMAGEN_EVENTO', e.titulo FROM evento e WHERE e.imagen_id = m.id
  UNION ALL
  SELECT 3, 'IMAGEN_GRUPO', g.nombre FROM grupo_pastoral g WHERE g.imagen_id = m.id
  UNION ALL
  SELECT 4, 'ARCHIVO_BOLETIN', b.titulo FROM boletin b WHERE b.archivo_id = m.id
  UNION ALL
  SELECT 5, 'PORTADA_SEDE', sd.nombre
    FROM sede sd
   WHERE sd.url_imagen_portada = m.url
      OR right(sd.url_imagen_portada, length(m.url) + 1) = '/' || m.url
  UNION ALL
  SELECT 6, 'CONTENIDO_PUBLICACION', p.titulo
    FROM publicacion p
   WHERE ${UUID_DE_LA_CLAVE} IS NOT NULL AND p.contenido::text LIKE '%' || ${UUID_DE_LA_CLAVE} || '%'
  UNION ALL
  SELECT 7, 'CONTENIDO_SERVICIO', sv.nombre
    FROM servicio sv
   WHERE ${UUID_DE_LA_CLAVE} IS NOT NULL AND sv.contenido::text LIKE '%' || ${UUID_DE_LA_CLAVE} || '%'
  UNION ALL
  SELECT 8, 'BLOQUE_PAGINA', pg.titulo
    FROM bloque bl
    JOIN pagina pg ON pg.id = bl.pagina_id
   WHERE ${UUID_DE_LA_CLAVE} IS NOT NULL AND bl.contenido::text LIKE '%' || ${UUID_DE_LA_CLAVE} || '%'`;

const SELECCION = `
  SELECT ${COLUMNAS_ARCHIVO},
         EXISTS (SELECT 1 FROM (${USOS}) uso) AS en_uso
  ${UNIONES_ARCHIVO}`;

export async function buscarPorId(id) {
  const { rows } = await consultar(`${SELECCION} WHERE m.id = $1`, [id]);
  return rows[0];
}

// Usos del archivo, en el orden del contrato: [{ tipo, nombre }].
export async function usosDe(id) {
  const { rows } = await consultar(
    `SELECT uso.tipo, uso.nombre
       FROM archivo_multimedia m
      CROSS JOIN LATERAL (${USOS}) uso
      WHERE m.id = $1
      ORDER BY uso.orden, uso.nombre`,
    [id],
  );
  return rows;
}

const CLASES_SQL = {
  IMAGEN: "m.tipo_mime LIKE 'image/%'",
  VIDEO: "m.tipo_mime LIKE 'video/%'",
  DOCUMENTO: "m.tipo_mime = 'application/pdf'",
};
const ORDENES_SQL = { fechaSubida: 'b.fecha_subida', tamanoBytes: 'b.tamano_bytes' };

// Página de la biblioteca y el total que cumple los filtros.
// filtros: { sedeSlug?, clase?, patron?, enUso? }; orden: campo (fechaSubida|tamanoBytes) y sentido.
export async function listar(filtros, { limite, desplazamiento, campo, ascendente }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (filtros.sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(filtros.sedeSlug)}`);
  if (filtros.clase !== undefined) condiciones.push(CLASES_SQL[filtros.clase]);
  if (filtros.patron !== undefined) {
    const patron = agregar(filtros.patron);
    condiciones.push(
      `(${sinAcentosSql('m.nombre_original')} LIKE ${patron} ESCAPE '\\'
        OR ${sinAcentosSql("COALESCE(m.texto_alternativo, '')")} LIKE ${patron} ESCAPE '\\')`,
    );
  }

  const base = `${SELECCION} WHERE ${condiciones.join(' AND ')}`;
  const filtroUso = filtros.enUso === undefined ? '' : `WHERE b.en_uso = ${agregar(filtros.enUso)}`;
  const direccion = ascendente ? 'ASC' : 'DESC';

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT b.* FROM (${base}) b ${filtroUso}
        ORDER BY ${ORDENES_SQL[campo]} ${direccion}, b.id ${direccion}
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM (${base}) b ${filtroUso}`, parametros),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}

// Fila de la tabla (sin uniones), bloqueada hasta el fin de la transacción: es el "antes" de la
// bitácora y evita que otro cambio se cuele en el medio.
export async function filaParaModificar(id, db) {
  const { rows } = await db.consultar('SELECT * FROM archivo_multimedia WHERE id = $1 FOR UPDATE', [
    id,
  ]);
  return rows[0];
}

// Devuelve la fila de la tabla ya cambiada. "db": la transacción del cambio y su bitácora.
export async function actualizarTextoAlternativo(id, textoAlternativo, db = { consultar }) {
  const { rows } = await db.consultar(
    'UPDATE archivo_multimedia SET texto_alternativo = $2 WHERE id = $1 RETURNING *',
    [id, textoAlternativo],
  );
  return rows[0];
}

// Devuelve la fila borrada. "db": la transacción del borrado, su bitácora y los objetos del bucket.
export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM archivo_multimedia WHERE id = $1 RETURNING *', [
    id,
  ]);
  return rows[0];
}
