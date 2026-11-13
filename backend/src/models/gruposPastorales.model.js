// Consultas de grupos pastorales (SQL parametrizado).
import { consultar } from '../db/index.js';

// Grupos visibles de una sede, por orden, con su imagen (si tiene) en la misma consulta.
export async function listarVisibles(sedeId) {
  const { rows } = await consultar(
    `SELECT g.id,
            g.nombre,
            g.descripcion,
            g.horario_reunion,
            g.contacto,
            g.icono,
            g.orden,
            am.id AS imagen_id,
            am.url AS imagen_url,
            am.texto_alternativo AS imagen_texto_alternativo,
            am.ancho_px AS imagen_ancho,
            am.alto_px AS imagen_alto
       FROM grupo_pastoral g
       LEFT JOIN archivo_multimedia am ON am.id = g.imagen_id
      WHERE g.sede_id = $1 AND g.visible
      ORDER BY g.orden, g.id`,
    [sedeId],
  );
  return rows;
}

const COLUMNAS_ADMIN = `
  g.id,
  g.nombre,
  g.descripcion,
  g.horario_reunion,
  g.contacto,
  g.icono,
  g.orden,
  g.visible,
  s.id     AS sede_id,
  s.nombre AS sede_nombre,
  s.slug   AS sede_slug,
  am.id    AS imagen_id,
  am.url   AS imagen_url,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px  AS imagen_alto`;

const UNIONES_ADMIN = `
  FROM grupo_pastoral g
  JOIN sede s ON s.id = g.sede_id
  LEFT JOIN archivo_multimedia am ON am.id = g.imagen_id`;

export async function listarAdmin({ sedeSlug, sedeId, visible } = {}, db = { consultar }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  if (sedeId !== undefined) condiciones.push(`g.sede_id = ${agregar(sedeId)}`);
  if (visible !== undefined) condiciones.push(`g.visible = ${agregar(visible)}`);

  const { rows } = await db.consultar(
    `SELECT ${COLUMNAS_ADMIN}
     ${UNIONES_ADMIN}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY g.orden, g.id`,
    parametros,
  );
  return rows;
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE g.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM grupo_pastoral WHERE id = $1 FOR UPDATE', [
    id,
  ]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function crear(
  { sedeId, imagenId, nombre, descripcion, horarioReunion, contacto, icono, visible },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO grupo_pastoral
       (sede_id, imagen_id, nombre, descripcion, horario_reunion, contacto, icono, orden, visible)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       COALESCE((SELECT MAX(orden) FROM grupo_pastoral WHERE sede_id = $1), 0) + 1,
       $8
     )
     RETURNING *`,
    [sedeId, imagenId, nombre, descripcion, horarioReunion, contacto, icono, visible],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  imagenId: 'imagen_id',
  nombre: 'nombre',
  descripcion: 'descripcion',
  horarioReunion: 'horario_reunion',
  contacto: 'contacto',
  icono: 'icono',
  visible: 'visible',
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
    `UPDATE grupo_pastoral SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...valores],
  );
  return rows[0];
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM grupo_pastoral WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}
