// Consultas de horarios (SQL parametrizado).
import { consultar } from '../db/index.js';

// Horarios activos de una sede con su tipo, ya ordenados para agruparlos:
// por tipo (id), día, hora de inicio, hora de fin y descripción.
// tipoIds: lista de ids de tipo_horario para filtrar, o null para todos.
export async function listarActivos(sedeId, tipoIds = null) {
  const { rows } = await consultar(
    `SELECT th.id AS tipo_id,
            th.nombre AS tipo_nombre,
            h.dia_semana,
            h.hora_inicio,
            h.hora_fin,
            h.descripcion
       FROM horario h
       JOIN tipo_horario th ON th.id = h.tipo_horario_id
      WHERE h.sede_id = $1
        AND h.activo
        AND ($2::int[] IS NULL OR th.id = ANY($2::int[]))
      ORDER BY th.id, h.dia_semana, h.hora_inicio, h.hora_fin NULLS FIRST, h.descripcion NULLS FIRST`,
    [sedeId, tipoIds],
  );
  return rows;
}

const COLUMNAS_ADMIN = `
  h.id,
  h.dia_semana,
  h.hora_inicio,
  h.hora_fin,
  h.descripcion,
  h.activo,
  s.id     AS sede_id,
  s.nombre AS sede_nombre,
  s.slug   AS sede_slug,
  th.id    AS tipo_id,
  th.nombre AS tipo_nombre`;

const UNIONES_ADMIN = `
  FROM horario h
  JOIN sede s ON s.id = h.sede_id
  JOIN tipo_horario th ON th.id = h.tipo_horario_id`;

// Lista horarios para el panel CMS (sin agrupar ni paginar), ordenados por tipo, día y hora.
export async function listarAdmin({ sedeSlug, tipoIds, activo } = {}) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  if (tipoIds !== undefined) condiciones.push(`th.id = ANY(${agregar(tipoIds)}::int[])`);
  if (activo !== undefined) condiciones.push(`h.activo = ${agregar(activo)}`);

  const { rows } = await consultar(
    `SELECT ${COLUMNAS_ADMIN}
     ${UNIONES_ADMIN}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY th.id, h.dia_semana, h.hora_inicio, h.hora_fin NULLS FIRST, h.id`,
    parametros,
  );
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE h.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM horario WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function existeTipoHorario(tipoHorarioId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM tipo_horario WHERE id = $1', [tipoHorarioId]);
  return Boolean(rows[0]);
}

export async function crear(
  { sedeId, tipoHorarioId, diaSemana, horaInicio, horaFin, descripcion, activo },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [sedeId, tipoHorarioId, diaSemana, horaInicio, horaFin, descripcion, activo],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  tipoHorarioId: 'tipo_horario_id',
  diaSemana: 'dia_semana',
  horaInicio: 'hora_inicio',
  horaFin: 'hora_fin',
  descripcion: 'descripcion',
  activo: 'activo',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const entradas = Object.entries(cambios).filter(
    ([clave, valor]) => clave in COLUMNAS_ACTUALIZABLES && valor !== undefined,
  );
  if (entradas.length === 0) return filaParaModificar(id, db);

  const asignaciones = entradas.map(
    ([clave], indice) => `${COLUMNAS_ACTUALIZABLES[clave]} = $${indice + 2}`,
  );
  const valores = entradas.map(([, valor]) => valor);

  const { rows } = await db.consultar(
    `UPDATE horario SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...valores],
  );
  return rows[0];
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM horario WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}
