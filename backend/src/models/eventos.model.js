// Consultas de eventos del calendario (SQL parametrizado). Todo se compara con now() de
// PostgreSQL y los días se calculan en la zona de Bolivia.
import { consultar } from '../db/index.js';

export const ZONA_HORARIA = 'America/La_Paz';

const COLUMNAS = `
  e.id,
  e.titulo,
  e.descripcion,
  e.lugar,
  e.fecha_inicio,
  e.fecha_fin,
  e.todo_el_dia,
  json_build_object('id', ce.id, 'nombre', ce.nombre, 'colorHex', ce.color_hex) AS categoria,
  am.id AS imagen_id,
  am.url AS imagen_url,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px AS imagen_alto`;

const UNIONES = `
  JOIN estado_publicacion ep ON ep.id = e.estado_publicacion_id
  JOIN categoria_evento ce ON ce.id = e.categoria_evento_id
  LEFT JOIN archivo_multimedia am ON am.id = e.imagen_id`;

// Arma el WHERE de los próximos eventos publicados de una sede.
// $1 = sede, $2 = nombre del estado Publicado, $3 = zona horaria.
//  * Próximo (RF-09): con fecha_fin, mientras fecha_fin > now(); sin fecha_fin, hasta el final del
//    día de fecha_inicio en Bolivia (antes de la medianoche siguiente).
//  * Rango [desde, hasta] en días de Bolivia: el evento se incluye si se cruza con el rango
//    (un evento de varios días que ya empezó sigue apareciendo). desde nunca es anterior a hoy.
function filtros({ sedeId, estadoPublicado, desde, hasta, categorias }) {
  const parametros = [sedeId, estadoPublicado, ZONA_HORARIA];
  const agregar = (valor) => `$${parametros.push(valor)}`;
  const diaInicio = '(e.fecha_inicio AT TIME ZONE $3)::date';
  const diaFin = '(coalesce(e.fecha_fin, e.fecha_inicio) AT TIME ZONE $3)::date';
  const hoy = '(now() AT TIME ZONE $3)::date';

  const condiciones = [
    'e.sede_id = $1',
    'ep.nombre = $2',
    `(CASE WHEN e.fecha_fin IS NOT NULL THEN e.fecha_fin > now()
           ELSE ((${diaInicio} + 1)::timestamp AT TIME ZONE $3) > now() END)`,
    `${diaFin} >= GREATEST(${desde ? `${agregar(desde)}::date` : hoy}, ${hoy})`,
  ];
  if (hasta) condiciones.push(`${diaInicio} <= ${agregar(hasta)}::date`);
  if (categorias) condiciones.push(`ce.id = ANY(${agregar(categorias)}::int[])`);

  return { donde: condiciones.join(' AND '), parametros };
}

// Página de próximos eventos (por fecha de inicio) y el total que cumple los filtros.
export async function listarProximos(criterios, { limite, desplazamiento }) {
  const { donde, parametros } = filtros(criterios);

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS}
         FROM evento e ${UNIONES}
        WHERE ${donde}
        ORDER BY e.fecha_inicio, e.id
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM evento e ${UNIONES} WHERE ${donde}`, parametros),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}
