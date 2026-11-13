// Consultas de páginas con bloques (SQL parametrizado). Solo páginas en estado Publicado.
import { consultar } from '../db/index.js';

// Páginas publicadas que van en el menú, por orden de menú.
export async function listarDelMenu(sedeId, estadoPublicado) {
  const { rows } = await consultar(
    `SELECT p.id, p.slug, p.titulo, p.pagina_padre_id, p.orden_menu
       FROM pagina p
       JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id
      WHERE p.sede_id = $1 AND ep.nombre = $2 AND p.mostrar_en_menu
      ORDER BY p.orden_menu, p.id`,
    [sedeId, estadoPublicado],
  );
  return rows;
}

// Página publicada por slug con su página padre y sus bloques visibles (misma consulta).
// Los bloques salen ordenados y con el código de su tipo; su contenido se entrega tal cual.
export async function obtenerPublicadaPorSlug(sedeId, estadoPublicado, slug) {
  const { rows } = await consultar(
    `SELECT p.id,
            p.slug,
            p.titulo,
            p.descripcion_seo,
            p.fecha_actualizacion,
            CASE WHEN padre.id IS NULL THEN NULL
                 ELSE json_build_object('id', padre.id, 'slug', padre.slug, 'titulo', padre.titulo)
            END AS pagina_padre,
            COALESCE(
              (SELECT json_agg(
                        json_build_object('id', b.id, 'tipo', tb.codigo, 'orden', b.orden, 'contenido', b.contenido)
                        ORDER BY b.orden, b.id)
                 FROM bloque b
                 JOIN tipo_bloque tb ON tb.id = b.tipo_bloque_id
                WHERE b.pagina_id = p.id AND b.visible),
              '[]'::json
            ) AS bloques
       FROM pagina p
       JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id
       LEFT JOIN pagina padre ON padre.id = p.pagina_padre_id
      WHERE p.sede_id = $1 AND ep.nombre = $2 AND p.slug = $3`,
    [sedeId, estadoPublicado, slug],
  );
  return rows[0] ?? null;
}
