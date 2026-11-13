// Consultas de eventos del panel (SQL parametrizado). A diferencia del portal, aquí se ven todos
// los estados y los eventos ya finalizados. Los días se calculan en la zona de Bolivia.
import { consultar } from '../db/index.js';
import { ZONA_HORARIA } from './eventos.model.js';

// $1 = zona horaria. "finalizado" repite la regla del portal (publico.md, RF-09): con fecha_fin,
// cuando ya pasó; sin ella, cuando terminó el día de fecha_inicio en Bolivia.
const FINALIZADO = `(CASE WHEN e.fecha_fin IS NOT NULL THEN e.fecha_fin <= now()
                         ELSE ((((e.fecha_inicio AT TIME ZONE $1)::date + 1)::timestamp AT TIME ZONE $1) <= now())
                    END)`;

const COLUMNAS = `
  e.id,
  e.sede_id,
  s.nombre AS sede_nombre,
  s.slug AS sede_slug,
  ep.nombre AS estado_nombre,
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
  am.alto_px AS imagen_alto,
  e.id_externo_m365,
  e.creado_por,
  u.nombre_completo AS creado_por_nombre,
  ${FINALIZADO} AS finalizado`;

const UNIONES = `
  FROM evento e
  JOIN sede s ON s.id = e.sede_id
  JOIN estado_publicacion ep ON ep.id = e.estado_publicacion_id
  JOIN categoria_evento ce ON ce.id = e.categoria_evento_id
  JOIN usuario u ON u.id = e.creado_por
  LEFT JOIN archivo_multimedia am ON am.id = e.imagen_id`;

// filtros: { sedeSlug?, desde?, hasta? (YYYY-MM-DD), categorias?, estados? (nombres), finalizados? }
export async function listar(filtros, { limite, desplazamiento, ascendente }) {
  const parametros = [ZONA_HORARIA];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;
  const diaInicio = '(e.fecha_inicio AT TIME ZONE $1)::date';
  const diaFin = '(coalesce(e.fecha_fin, e.fecha_inicio) AT TIME ZONE $1)::date';

  if (filtros.sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(filtros.sedeSlug)}`);
  // Rango en días de Bolivia: el evento entra si se cruza con él.
  if (filtros.desde) condiciones.push(`${diaFin} >= ${agregar(filtros.desde)}::date`);
  if (filtros.hasta) condiciones.push(`${diaInicio} <= ${agregar(filtros.hasta)}::date`);
  if (filtros.categorias) condiciones.push(`ce.id = ANY(${agregar(filtros.categorias)}::int[])`);
  if (filtros.estados) condiciones.push(`ep.nombre = ANY(${agregar(filtros.estados)}::text[])`);
  if (filtros.finalizados !== undefined) {
    condiciones.push(`${FINALIZADO} = ${agregar(filtros.finalizados)}`);
  }

  const donde = condiciones.join(' AND ');
  const direccion = ascendente ? 'ASC' : 'DESC';

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS} ${UNIONES}
        WHERE ${donde}
        ORDER BY e.fecha_inicio ${direccion}, e.id ${direccion}
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

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS} ${UNIONES} WHERE e.id = $2`, [
    ZONA_HORARIA,
    id,
  ]);
  return rows[0];
}

export async function insertar(datos, db) {
  const { rows } = await db.consultar(
    `INSERT INTO evento
       (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, imagen_id, titulo,
        descripcion, lugar, fecha_inicio, fecha_fin, todo_el_dia)
     VALUES ($1, $2, (SELECT id FROM estado_publicacion WHERE nombre = $3), $4, $5, $6, $7, $8,
             $9, $10, $11)
     RETURNING *`,
    [
      datos.sedeId,
      datos.categoriaEventoId,
      datos.estadoNombre,
      datos.creadoPor,
      datos.imagenId,
      datos.titulo,
      datos.descripcion,
      datos.lugar,
      datos.fechaInicio,
      datos.fechaFin,
      datos.todoElDia,
    ],
  );
  return rows[0];
}

export async function categoriaEventoExiste(id, db) {
  const { rows } = await db.consultar('SELECT 1 FROM categoria_evento WHERE id = $1', [id]);
  return rows.length > 0;
}

export async function idDeEstado(nombre, db) {
  const { rows } = await db.consultar('SELECT id FROM estado_publicacion WHERE nombre = $1', [
    nombre,
  ]);
  return rows[0].id;
}
