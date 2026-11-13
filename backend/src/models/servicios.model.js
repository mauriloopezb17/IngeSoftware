// Consultas de servicios y sacramentos (SQL parametrizado).
import { consultar } from '../db/index.js';

const COLUMNAS = 's.id, s.slug, s.nombre, s.descripcion_corta, s.icono, s.orden';

// Servicios visibles de una sede, por orden.
export async function listarVisibles(sedeId) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS}
       FROM servicio s
      WHERE s.sede_id = $1 AND s.visible
      ORDER BY s.orden, s.id`,
    [sedeId],
  );
  return rows;
}

// Servicio visible por slug, con su contenido y sus preguntas frecuentes activas (misma consulta).
export async function obtenerVisiblePorSlug(sedeId, slug) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS},
            s.contenido,
            COALESCE(
              (SELECT json_agg(
                        json_build_object('id', pf.id, 'pregunta', pf.pregunta, 'respuesta', pf.respuesta)
                        ORDER BY pf.orden, pf.id)
                 FROM pregunta_frecuente pf
                WHERE pf.servicio_id = s.id AND pf.activa),
              '[]'::json
            ) AS preguntas_frecuentes
       FROM servicio s
      WHERE s.sede_id = $1 AND s.slug = $2 AND s.visible`,
    [sedeId, slug],
  );
  return rows[0] ?? null;
}

const COLUMNAS_ADMIN = `
  s.id,
  s.slug,
  s.nombre,
  s.descripcion_corta,
  s.icono,
  s.contenido,
  s.orden,
  s.visible,
  se.id     AS sede_id,
  se.nombre AS sede_nombre,
  se.slug   AS sede_slug,
  COALESCE(
    (SELECT json_agg(
              json_build_object(
                'id', pf.id,
                'pregunta', pf.pregunta,
                'respuesta', pf.respuesta,
                'orden', pf.orden,
                'activa', pf.activa
              )
              ORDER BY pf.orden, pf.id)
       FROM pregunta_frecuente pf
      WHERE pf.servicio_id = s.id),
    '[]'::json
  ) AS preguntas_frecuentes`;

const UNIONES_ADMIN = `
  FROM servicio s
  JOIN sede se ON se.id = s.sede_id`;

// Lista servicios para el panel CMS (sin paginar), por orden.
export async function listarAdmin({ sedeSlug, sedeId, visible } = {}, db = { consultar }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (sedeSlug !== undefined) condiciones.push(`se.slug = ${agregar(sedeSlug)}`);
  if (sedeId !== undefined) condiciones.push(`s.sede_id = ${agregar(sedeId)}`);
  if (visible !== undefined) condiciones.push(`s.visible = ${agregar(visible)}`);

  const { rows } = await db.consultar(
    `SELECT ${COLUMNAS_ADMIN}
     ${UNIONES_ADMIN}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY s.orden, s.id`,
    parametros,
  );
  return rows;
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE s.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM servicio WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function crear(
  { sedeId, slug, nombre, descripcionCorta, icono, contenido, visible },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO servicio (sede_id, slug, nombre, descripcion_corta, icono, contenido, orden, visible)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6::jsonb,
       COALESCE((SELECT MAX(orden) FROM servicio WHERE sede_id = $1), 0) + 1,
       $7
     )
     RETURNING *`,
    [sedeId, slug, nombre, descripcionCorta, icono, JSON.stringify(contenido), visible],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  slug: 'slug',
  nombre: 'nombre',
  descripcionCorta: 'descripcion_corta',
  icono: 'icono',
  visible: 'visible',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const asignaciones = [];
  const valores = [id];

  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined) continue;
    if (clave === 'contenido') {
      valores.push(JSON.stringify(valor));
      asignaciones.push(`contenido = $${valores.length}::jsonb`);
    } else if (clave in COLUMNAS_ACTUALIZABLES) {
      valores.push(valor);
      asignaciones.push(`${COLUMNAS_ACTUALIZABLES[clave]} = $${valores.length}`);
    }
  }

  if (asignaciones.length === 0) return filaParaModificar(id, db);

  const { rows } = await db.consultar(
    `UPDATE servicio SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    valores,
  );
  return rows[0];
}

// Al borrar un servicio, sus preguntas frecuentes quedan huérfanas (servicio_id = NULL) para el bot.
export async function desvincularPreguntasDeServicio(servicioId, db = { consultar }) {
  const { rows: anteriores } = await db.consultar(
    'SELECT * FROM pregunta_frecuente WHERE servicio_id = $1 ORDER BY orden, id FOR UPDATE',
    [servicioId],
  );
  if (anteriores.length === 0) return [];

  const { rows: nuevas } = await db.consultar(
    'UPDATE pregunta_frecuente SET servicio_id = NULL WHERE servicio_id = $1 RETURNING *',
    [servicioId],
  );
  const nuevaPorId = new Map(nuevas.map((fila) => [fila.id, fila]));
  return anteriores.map((anterior) => ({ anterior, nuevo: nuevaPorId.get(anterior.id) }));
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM servicio WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}

export async function listarPreguntasDeServicio(servicioId, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT id, pregunta, respuesta, orden, activa
       FROM pregunta_frecuente
      WHERE servicio_id = $1
      ORDER BY orden, id`,
    [servicioId],
  );
  return rows;
}

export async function buscarPreguntaEnServicio(servicioId, preguntaId, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT id, pregunta, respuesta, orden, activa
       FROM pregunta_frecuente
      WHERE id = $1 AND servicio_id = $2`,
    [preguntaId, servicioId],
  );
  return rows[0] ?? null;
}

export async function filaPreguntaParaModificar(servicioId, preguntaId, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT * FROM pregunta_frecuente WHERE id = $1 AND servicio_id = $2 FOR UPDATE',
    [preguntaId, servicioId],
  );
  return rows[0] ?? null;
}

export async function crearPregunta(
  { sedeId, servicioId, pregunta, respuesta, activa },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO pregunta_frecuente (sede_id, servicio_id, pregunta, respuesta, orden, activa)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       COALESCE((SELECT MAX(orden) FROM pregunta_frecuente WHERE servicio_id = $2), -1) + 1,
       $5
     )
     RETURNING *`,
    [sedeId, servicioId, pregunta, respuesta, activa],
  );
  return rows[0];
}

const COLUMNAS_PREGUNTA = {
  pregunta: 'pregunta',
  respuesta: 'respuesta',
  activa: 'activa',
  orden: 'orden',
};

export async function actualizarPregunta(preguntaId, cambios, db = { consultar }) {
  const entradas = Object.entries(cambios).filter(
    ([clave, valor]) => clave in COLUMNAS_PREGUNTA && valor !== undefined,
  );
  if (entradas.length === 0) {
    const { rows } = await db.consultar('SELECT * FROM pregunta_frecuente WHERE id = $1', [
      preguntaId,
    ]);
    return rows[0] ?? null;
  }

  const asignaciones = entradas.map(
    ([clave], indice) => `${COLUMNAS_PREGUNTA[clave]} = $${indice + 2}`,
  );
  const valores = entradas.map(([, valor]) => valor);

  const { rows } = await db.consultar(
    `UPDATE pregunta_frecuente SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [preguntaId, ...valores],
  );
  return rows[0];
}

export async function eliminarPregunta(servicioId, preguntaId, db = { consultar }) {
  const { rows } = await db.consultar(
    'DELETE FROM pregunta_frecuente WHERE id = $1 AND servicio_id = $2 RETURNING *',
    [preguntaId, servicioId],
  );
  return rows[0] ?? null;
}

export async function filasPreguntasParaReordenar(servicioId, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT * FROM pregunta_frecuente WHERE servicio_id = $1 ORDER BY orden, id FOR UPDATE',
    [servicioId],
  );
  return rows;
}
