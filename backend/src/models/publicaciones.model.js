// Consultas de publicaciones vigentes del portal (SQL parametrizado).
// Vigencia (docs/api/estados-publicacion.md §4), comparada con now() de PostgreSQL:
//   estado = Publicado  y  fecha_publicacion <= now()  y  (fecha_expiracion es null o > now())
import { consultar } from '../db/index.js';
import { sinAcentosSql } from '../utils/busqueda.js';

const COLUMNAS = `
  p.id,
  tp.nombre AS tipo_nombre,
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
  p.fecha_expiracion`;

const UNIONES = `
  JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id
  JOIN tipo_publicacion tp ON tp.id = p.tipo_publicacion_id
  LEFT JOIN categoria c ON c.id = p.categoria_id
  LEFT JOIN archivo_multimedia am ON am.id = p.imagen_portada_id`;

// Condiciones de las publicaciones vigentes de una sede ($1 = sede, $2 = nombre del estado Publicado).
const VIGENTES = `
  p.sede_id = $1
  AND ep.nombre = $2
  AND p.fecha_publicacion <= now()
  AND (p.fecha_expiracion IS NULL OR p.fecha_expiracion > now())`;

// Arma el WHERE de la lista con los filtros opcionales, siempre con parámetros.
function filtrosLista({ sedeId, estadoPublicado, tipos, categoria, destacada, patron }) {
  const parametros = [sedeId, estadoPublicado];
  const condiciones = [VIGENTES];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  if (tipos) condiciones.push(`tp.nombre = ANY(${agregar(tipos)}::text[])`);
  if (categoria) condiciones.push(`c.slug = ${agregar(categoria)}`);
  if (destacada !== undefined) condiciones.push(`p.destacada = ${agregar(destacada)}`);
  if (patron) {
    const valor = agregar(patron);
    condiciones.push(
      `(${sinAcentosSql('p.titulo')} LIKE ${valor} ESCAPE '\\'
        OR ${sinAcentosSql("coalesce(p.resumen, '')")} LIKE ${valor} ESCAPE '\\')`,
    );
  }

  return { donde: condiciones.join(' AND '), parametros };
}

// Página de publicaciones vigentes y el total que cumple los filtros.
// filtros: { sedeId, estadoPublicado, tipos?: string[] (nombres), categoria?, destacada?, patron? }
export async function listarVigentes(filtros, { limite, desplazamiento, ascendente }) {
  const { donde, parametros } = filtrosLista(filtros);
  const direccion = ascendente ? 'ASC' : 'DESC';

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS}
         FROM publicacion p ${UNIONES}
        WHERE ${donde}
        ORDER BY p.fecha_publicacion ${direccion}, p.id ${direccion}
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(
      `SELECT count(*)::int AS total FROM publicacion p ${UNIONES} WHERE ${donde}`,
      parametros,
    ),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}

// Publicación vigente por slug, con su contenido, o null.
export async function obtenerVigentePorSlug({ sedeId, estadoPublicado, slug }) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS}, p.contenido
       FROM publicacion p ${UNIONES}
      WHERE ${VIGENTES} AND p.slug = $3`,
    [sedeId, estadoPublicado, slug],
  );
  return rows[0] ?? null;
}
