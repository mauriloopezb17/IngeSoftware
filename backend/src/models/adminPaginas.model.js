// Consultas de páginas y bloques del panel (SQL parametrizado). Aquí se ven todos los estados y
// todos los bloques, también los no visibles.
import { consultar } from '../db/index.js';

const COLUMNAS = `
  p.id,
  p.sede_id,
  s.nombre AS sede_nombre,
  s.slug AS sede_slug,
  ep.nombre AS estado_nombre,
  p.slug,
  p.titulo,
  p.descripcion_seo,
  CASE WHEN padre.id IS NULL THEN NULL
       ELSE json_build_object('id', padre.id, 'slug', padre.slug, 'titulo', padre.titulo)
  END AS pagina_padre,
  p.mostrar_en_menu,
  p.orden_menu,
  p.creado_por,
  uc.nombre_completo AS creado_por_nombre,
  p.actualizado_por,
  ua.nombre_completo AS actualizado_por_nombre,
  p.fecha_creacion,
  p.fecha_actualizacion`;

const BLOQUES = `
  COALESCE(
    (SELECT json_agg(
              json_build_object('id', b.id, 'tipo', tb.codigo, 'orden', b.orden,
                                'visible', b.visible, 'contenido', b.contenido,
                                'fechaActualizacion', b.fecha_actualizacion)
              ORDER BY b.orden, b.id)
       FROM bloque b JOIN tipo_bloque tb ON tb.id = b.tipo_bloque_id
      WHERE b.pagina_id = p.id),
    '[]'::json) AS bloques`;

const UNIONES = `
  FROM pagina p
  JOIN sede s ON s.id = p.sede_id
  JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id
  JOIN usuario uc ON uc.id = p.creado_por
  LEFT JOIN usuario ua ON ua.id = p.actualizado_por
  LEFT JOIN pagina padre ON padre.id = p.pagina_padre_id`;

// Sin paginar, sin bloques. filtros: { sedeSlug?, estados? (nombres) }. Orden: menú y título.
export async function listar({ sedeSlug, estados }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;
  if (sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  if (estados) condiciones.push(`ep.nombre = ANY(${agregar(estados)}::text[])`);

  const { rows } = await consultar(
    `SELECT ${COLUMNAS} ${UNIONES}
      WHERE ${condiciones.join(' AND ')}
      ORDER BY p.orden_menu, p.titulo, p.id`,
    parametros,
  );
  return rows;
}

// Una página con todos sus bloques, o undefined.
export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS}, ${BLOQUES} ${UNIONES} WHERE p.id = $1`, [
    id,
  ]);
  return rows[0];
}

export async function insertar(datos, db) {
  const { rows } = await db.consultar(
    `INSERT INTO pagina
       (sede_id, pagina_padre_id, estado_publicacion_id, creado_por, slug, titulo,
        descripcion_seo, mostrar_en_menu, orden_menu)
     VALUES ($1, $2, (SELECT id FROM estado_publicacion WHERE nombre = $3), $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      datos.sedeId,
      datos.paginaPadreId,
      datos.estadoNombre,
      datos.creadoPor,
      datos.slug,
      datos.titulo,
      datos.descripcionSeo,
      datos.mostrarEnMenu,
      datos.ordenMenu,
    ],
  );
  return rows[0];
}

export async function idDeEstado(nombre, db) {
  const { rows } = await db.consultar('SELECT id FROM estado_publicacion WHERE nombre = $1', [
    nombre,
  ]);
  return rows[0].id;
}

// Página (fila de la tabla) por id y sede, para validar la página padre.
export async function paginaDeLaSede(id, sedeId, db) {
  const { rows } = await db.consultar(
    'SELECT id, pagina_padre_id FROM pagina WHERE id = $1 AND sede_id = $2',
    [id, sedeId],
  );
  return rows[0];
}

// Ids de la página y de todas sus descendientes (para evitar ciclos al cambiar la página padre).
export async function idsDeLaRama(id, db) {
  const { rows } = await db.consultar(
    `WITH RECURSIVE rama AS (
       SELECT id FROM pagina WHERE id = $1
       UNION
       SELECT h.id FROM pagina h JOIN rama r ON h.pagina_padre_id = r.id
     )
     SELECT id FROM rama`,
    [id],
  );
  return rows.map((fila) => fila.id);
}

// Nivel de la página en el árbol: 1 si es raíz, 2 si su padre es raíz, etc. (el tope de 20 solo
// protege de un ciclo imposible en los datos).
export async function nivelDe(id, db) {
  const { rows } = await db.consultar(
    `WITH RECURSIVE ancestros AS (
       SELECT id, pagina_padre_id, 1 AS nivel FROM pagina WHERE id = $1
       UNION ALL
       SELECT p.id, p.pagina_padre_id, a.nivel + 1
         FROM pagina p JOIN ancestros a ON p.id = a.pagina_padre_id
        WHERE a.nivel < 20
     )
     SELECT max(nivel)::int AS nivel FROM ancestros`,
    [id],
  );
  return rows[0].nivel;
}

// Niveles que ocupa la página con todas sus descendientes: 1 si no tiene hijas, 2 si tiene hijas
// pero ninguna nieta, etc.
export async function alturaDeLaRama(id, db) {
  const { rows } = await db.consultar(
    `WITH RECURSIVE rama AS (
       SELECT id, 1 AS nivel FROM pagina WHERE id = $1
       UNION ALL
       SELECT h.id, r.nivel + 1 FROM pagina h JOIN rama r ON h.pagina_padre_id = r.id
        WHERE r.nivel < 20
     )
     SELECT max(nivel)::int AS altura FROM rama`,
    [id],
  );
  return rows[0].altura;
}

export async function contarHijas(id, db) {
  const { rows } = await db.consultar(
    'SELECT count(*)::int AS total FROM pagina WHERE pagina_padre_id = $1',
    [id],
  );
  return rows[0].total;
}

// Bloques de la página (filas de la tabla), bloqueados hasta el fin de la transacción.
export async function filasDeBloques(paginaId, db) {
  const { rows } = await db.consultar(
    'SELECT * FROM bloque WHERE pagina_id = $1 ORDER BY orden, id FOR UPDATE',
    [paginaId],
  );
  return rows;
}

// ---- Bloques ----

// Tipo de bloque por código: { id, codigo, esquema_validacion }, o undefined.
export async function tipoBloquePorCodigo(codigo, db) {
  const { rows } = await db.consultar(
    'SELECT id, codigo, esquema_validacion FROM tipo_bloque WHERE codigo = $1',
    [codigo],
  );
  return rows[0];
}

// Bloque de la página con el código de su tipo y el esquema del tipo, o undefined.
export async function bloqueDeLaPagina(paginaId, bloqueId, db) {
  const { rows } = await db.consultar(
    `SELECT b.*, tb.codigo AS tipo_codigo, tb.esquema_validacion
       FROM bloque b JOIN tipo_bloque tb ON tb.id = b.tipo_bloque_id
      WHERE b.id = $2 AND b.pagina_id = $1
        FOR UPDATE OF b`,
    [paginaId, bloqueId],
  );
  return rows[0];
}

export async function insertarBloque(datos, db) {
  const { rows } = await db.consultar(
    `INSERT INTO bloque (pagina_id, tipo_bloque_id, orden, contenido, visible)
     VALUES ($1, $2,
             (SELECT COALESCE(max(orden), 0) + 1 FROM bloque WHERE pagina_id = $1),
             $3::jsonb, $4)
     RETURNING *`,
    [datos.paginaId, datos.tipoBloqueId, JSON.stringify(datos.contenido), datos.visible],
  );
  return rows[0];
}

export async function eliminarBloques(paginaId, db) {
  await db.consultar('DELETE FROM bloque WHERE pagina_id = $1', [paginaId]);
}

export async function eliminarPagina(id, db) {
  const { rows } = await db.consultar('DELETE FROM pagina WHERE id = $1 RETURNING *', [id]);
  return rows[0];
}
