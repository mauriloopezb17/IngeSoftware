// Consultas de proclamas matrimoniales del panel (SQL parametrizado). Aquí se ven también las
// publicaciones de fecha futura. "Alcanzada" = su fecha ya llegó (hoy en Bolivia o antes).
import { consultar } from '../db/index.js';
import { sinAcentosSql } from '../utils/busqueda.js';
import { ZONA_HORARIA } from './eventos.model.js';

// $1 = zona horaria.
const ALCANZADA = 'pp.fecha_publicacion <= (now() AT TIME ZONE $1)::date';

const COLUMNAS = `
  p.id,
  p.sede_id,
  s.nombre AS sede_nombre,
  s.slug AS sede_slug,
  p.nombre_contrayente_1,
  p.nombre_contrayente_2,
  p.fecha_matrimonio,
  p.tramite_origen_id,
  p.fecha_registro,
  (SELECT max(pp.numero_proclama) FROM proclama_publicacion pp
    WHERE pp.proclama_id = p.id AND ${ALCANZADA}) AS numero_proclama,
  COALESCE((SELECT json_agg(json_build_object('numero', pp.numero_proclama,
                                              'fecha', pp.fecha_publicacion)
                            ORDER BY pp.numero_proclama)
              FROM proclama_publicacion pp WHERE pp.proclama_id = p.id), '[]'::json) AS publicaciones,
  (EXISTS (SELECT 1 FROM proclama_publicacion pp WHERE pp.proclama_id = p.id AND ${ALCANZADA})
    AND p.fecha_matrimonio > now()) AS vigente`;

const UNIONES = 'FROM proclama p JOIN sede s ON s.id = p.sede_id';

// filtros: { sedeSlug?, vigentes?, anio?, patron? }
export async function listar(filtros, { limite, desplazamiento, ascendente }) {
  const parametros = [ZONA_HORARIA];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  if (filtros.sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(filtros.sedeSlug)}`);
  if (filtros.anio !== undefined) {
    condiciones.push(
      `extract(year FROM p.fecha_matrimonio AT TIME ZONE $1) = ${agregar(filtros.anio)}`,
    );
  }
  if (filtros.patron) {
    const patron = agregar(filtros.patron);
    condiciones.push(
      `(${sinAcentosSql('p.nombre_contrayente_1')} LIKE ${patron} ESCAPE '\\'
        OR ${sinAcentosSql('p.nombre_contrayente_2')} LIKE ${patron} ESCAPE '\\')`,
    );
  }

  const base = `SELECT ${COLUMNAS} ${UNIONES} WHERE ${condiciones.join(' AND ')}`;
  const filtroVigente =
    filtros.vigentes === undefined ? '' : `WHERE b.vigente = ${agregar(filtros.vigentes)}`;
  const direccion = ascendente ? 'ASC' : 'DESC';

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT b.* FROM (${base}) b ${filtroVigente}
        ORDER BY b.fecha_matrimonio ${direccion}, b.id ${direccion}
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM (${base}) b ${filtroVigente}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS} ${UNIONES} WHERE p.id = $2`, [
    ZONA_HORARIA,
    id,
  ]);
  return rows[0];
}

export async function insertar(datos, db) {
  const { rows } = await db.consultar(
    `INSERT INTO proclama
       (sede_id, tramite_origen_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      datos.sedeId,
      datos.tramiteOrigenId,
      datos.contrayente1,
      datos.contrayente2,
      datos.fechaMatrimonio,
    ],
  );
  return rows[0];
}

// Publicaciones de la proclama, por número: [{ numero_proclama, fecha_publicacion }].
export async function publicacionesDe(proclamaId, db) {
  const { rows } = await db.consultar(
    `SELECT numero_proclama, fecha_publicacion FROM proclama_publicacion
      WHERE proclama_id = $1 ORDER BY numero_proclama`,
    [proclamaId],
  );
  return rows;
}

export async function insertarPublicacion(proclamaId, numero, fecha, db) {
  await db.consultar(
    `INSERT INTO proclama_publicacion (proclama_id, numero_proclama, fecha_publicacion)
     VALUES ($1, $2, $3)`,
    [proclamaId, numero, fecha],
  );
}

export async function cambiarFechaPublicacion(proclamaId, numero, fecha, db) {
  await db.consultar(
    `UPDATE proclama_publicacion SET fecha_publicacion = $3
      WHERE proclama_id = $1 AND numero_proclama = $2`,
    [proclamaId, numero, fecha],
  );
}

export async function eliminarPublicacion(proclamaId, numero, db) {
  await db.consultar(
    'DELETE FROM proclama_publicacion WHERE proclama_id = $1 AND numero_proclama = $2',
    [proclamaId, numero],
  );
}

// Cuántas publicaciones de la proclama ya llegaron a su fecha.
export async function contarAlcanzadas(proclamaId, db) {
  const { rows } = await db.consultar(
    `SELECT count(*)::int AS total FROM proclama_publicacion pp
      WHERE pp.proclama_id = $2 AND ${ALCANZADA}`,
    [ZONA_HORARIA, proclamaId],
  );
  return rows[0].total;
}

// Fila bloqueada hasta el fin de la transacción.
export async function bloquear(id, db) {
  const { rows } = await db.consultar('SELECT * FROM proclama WHERE id = $1 FOR UPDATE', [id]);
  return rows[0];
}

export async function actualizar(id, cambios, db) {
  const { rows } = await db.consultar(
    `UPDATE proclama
        SET nombre_contrayente_1 = $2, nombre_contrayente_2 = $3, fecha_matrimonio = $4
      WHERE id = $1 RETURNING *`,
    [id, cambios.contrayente1, cambios.contrayente2, cambios.fechaMatrimonio],
  );
  return rows[0];
}

export async function eliminar(id, db) {
  await db.consultar('DELETE FROM proclama_publicacion WHERE proclama_id = $1', [id]);
  const { rows } = await db.consultar('DELETE FROM proclama WHERE id = $1 RETURNING *', [id]);
  return rows[0];
}
