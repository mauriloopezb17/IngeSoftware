// Consultas de publicaciones del panel (SQL parametrizado). A diferencia del portal, aquí se ven
// todos los estados. Los estados y tipos se filtran por nombre, nunca por id fijo.
import { consultar } from '../db/index.js';
import { sinAcentosSql } from '../utils/busqueda.js';

// Vista completa de una publicación. $1 = nombre del estado Publicado (para visible_en_portal).
const COLUMNAS = `
  p.id,
  p.sede_id,
  s.nombre AS sede_nombre,
  s.slug AS sede_slug,
  tp.nombre AS tipo_nombre,
  ep.nombre AS estado_nombre,
  p.titulo,
  p.slug,
  p.resumen,
  CASE WHEN c.id IS NULL THEN NULL
       ELSE json_build_object('id', c.id, 'nombre', c.nombre, 'slug', c.slug)
  END AS categoria,
  am.id AS imagen_id,
  am.url AS imagen_url,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px AS imagen_alto,
  p.url_externa,
  p.destacada,
  p.fecha_publicacion,
  p.fecha_expiracion,
  p.autor_id,
  au.nombre_completo AS autor_nombre,
  p.revisado_por,
  rv.nombre_completo AS revisor_nombre,
  p.fecha_revision,
  p.observacion_revision,
  p.fecha_creacion,
  (ep.nombre = $1
    AND p.fecha_publicacion <= now()
    AND (p.fecha_expiracion IS NULL OR p.fecha_expiracion > now())) AS visible_en_portal`;

const UNIONES = `
  FROM publicacion p
  JOIN sede s ON s.id = p.sede_id
  JOIN tipo_publicacion tp ON tp.id = p.tipo_publicacion_id
  JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id
  JOIN usuario au ON au.id = p.autor_id
  LEFT JOIN usuario rv ON rv.id = p.revisado_por
  LEFT JOIN categoria c ON c.id = p.categoria_id
  LEFT JOIN archivo_multimedia am ON am.id = p.imagen_portada_id`;

const ORDENES = {
  fechaCreacion: 'p.fecha_creacion',
  fechaPublicacion: 'p.fecha_publicacion',
  titulo: 'p.titulo',
};

// Página de publicaciones (sin contenido) y el total que cumple los filtros.
// filtros: { estadoPublicado, sedeSlug?, tipos?, estados? (nombres), categoria?, autorId?, patron? }
export async function listar(filtros, { limite, desplazamiento, campo, ascendente }) {
  const parametros = [filtros.estadoPublicado];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  if (filtros.sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(filtros.sedeSlug)}`);
  if (filtros.tipos) condiciones.push(`tp.nombre = ANY(${agregar(filtros.tipos)}::text[])`);
  if (filtros.estados) condiciones.push(`ep.nombre = ANY(${agregar(filtros.estados)}::text[])`);
  if (filtros.categoria) condiciones.push(`c.slug = ${agregar(filtros.categoria)}`);
  if (filtros.autorId !== undefined) condiciones.push(`p.autor_id = ${agregar(filtros.autorId)}`);
  if (filtros.patron) {
    const patron = agregar(filtros.patron);
    condiciones.push(
      `(${sinAcentosSql('p.titulo')} LIKE ${patron} ESCAPE '\\'
        OR ${sinAcentosSql("coalesce(p.resumen, '')")} LIKE ${patron} ESCAPE '\\')`,
    );
  }

  const donde = condiciones.join(' AND ');
  const direccion = ascendente ? 'ASC' : 'DESC';

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS} ${UNIONES}
        WHERE ${donde}
        ORDER BY ${ORDENES[campo]} ${direccion} NULLS LAST, p.id ${direccion}
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    // Sobre la misma selección: así se usan los mismos parámetros ($1 está en las columnas).
    consultar(
      `SELECT count(*)::int AS total FROM (SELECT ${COLUMNAS} ${UNIONES} WHERE ${donde}) t`,
      parametros,
    ),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}

// Publicación completa (con contenido) por id, o undefined.
export async function buscarPorId(id, estadoPublicado, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT ${COLUMNAS}, p.contenido ${UNIONES} WHERE p.id = $2`,
    [estadoPublicado, id],
  );
  return rows[0];
}

// Fila de la tabla bloqueada hasta el fin de la transacción, con el nombre de su tipo y de su
// estado aparte: { fila (el "antes" de la bitácora), tipoNombre, estadoNombre }. Así dos
// transiciones simultáneas no se pisan: la segunda espera y ve el estado que dejó la primera.
export async function bloquearParaModificar(id, db) {
  // Se bloquea solo `publicacion` primero: si se hiciera JOIN con `estado_publicacion` en el mismo
  // FOR UPDATE, PostgreSQL EvalPlanQual podría descartar la fila cuando otra transacción cambia
  // `estado_publicacion_id` concurrentemente y devolver 0 filas (404 en vez de 409).
  const { rows } = await db.consultar('SELECT * FROM publicacion WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) return undefined;

  const fila = rows[0];
  const { rows: catalogos } = await db.consultar(
    `SELECT tp.nombre AS tipo_nombre, ep.nombre AS estado_nombre
       FROM tipo_publicacion tp, estado_publicacion ep
      WHERE tp.id = $1 AND ep.id = $2`,
    [fila.tipo_publicacion_id, fila.estado_publicacion_id],
  );
  return {
    fila,
    tipoNombre: catalogos[0].tipo_nombre,
    estadoNombre: catalogos[0].estado_nombre,
  };
}

// Inserta una publicación en el estado indicado (por nombre). Devuelve la fila (RETURNING *).
export async function insertar(datos, db) {
  const { rows } = await db.consultar(
    `INSERT INTO publicacion
       (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, categoria_id,
        imagen_portada_id, titulo, slug, resumen, contenido, url_externa, destacada,
        fecha_publicacion, fecha_expiracion)
     VALUES ($1, (SELECT id FROM tipo_publicacion WHERE nombre = $2),
             (SELECT id FROM estado_publicacion WHERE nombre = $3),
             $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)
     RETURNING *`,
    [
      datos.sedeId,
      datos.tipoNombre,
      datos.estadoNombre,
      datos.autorId,
      datos.categoriaId,
      datos.imagenPortadaId,
      datos.titulo,
      datos.slug,
      datos.resumen,
      JSON.stringify(datos.contenido),
      datos.urlExterna,
      datos.destacada,
      datos.fechaPublicacion,
      datos.fechaExpiracion,
    ],
  );
  return rows[0];
}

// ¿Existe la categoría? (para el categoriaId del cuerpo).
export async function categoriaExiste(categoriaId, db) {
  const { rows } = await db.consultar('SELECT 1 FROM categoria WHERE id = $1', [categoriaId]);
  return rows.length > 0;
}

// Id de un estado por su nombre (para cambiar el estado sin usar ids fijos).
export async function idDeEstado(nombre, db) {
  const { rows } = await db.consultar('SELECT id FROM estado_publicacion WHERE nombre = $1', [
    nombre,
  ]);
  return rows[0].id;
}
