// Consultas que comparten los recursos del panel (/api/admin/...). Los nombres de tabla y de
// columna salen siempre del código, nunca de la petición; los valores van como parámetros.
import { consultar } from '../db/index.js';

// Actualiza las columnas de "cambios" ({ columna: valor }) de la fila "id" y devuelve la fila
// completa (RETURNING *), que es el "después" de la bitácora. "jsonb": columnas que se guardan
// como JSON. Sin cambios, devuelve la fila tal como está.
export async function actualizarFila(db, tabla, id, cambios, { jsonb = [] } = {}) {
  const columnas = Object.keys(cambios);
  if (columnas.length === 0) {
    const { rows } = await db.consultar(`SELECT * FROM ${tabla} WHERE id = $1`, [id]);
    return rows[0];
  }

  const asignaciones = columnas.map(
    (columna, indice) => `${columna} = $${indice + 2}${jsonb.includes(columna) ? '::jsonb' : ''}`,
  );
  const valores = columnas.map((columna) =>
    jsonb.includes(columna) ? JSON.stringify(cambios[columna]) : cambios[columna],
  );

  const { rows } = await db.consultar(
    `UPDATE ${tabla} SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...valores],
  );
  return rows[0];
}

// Fila de la tabla bloqueada hasta el fin de la transacción (el "antes" de la bitácora).
export async function filaParaModificar(db, tabla, id) {
  const { rows } = await db.consultar(`SELECT * FROM ${tabla} WHERE id = $1 FOR UPDATE`, [id]);
  return rows[0];
}

// Borra la fila y la devuelve (el "antes" del DELETE en la bitácora).
export async function eliminarFila(db, tabla, id) {
  const { rows } = await db.consultar(`DELETE FROM ${tabla} WHERE id = $1 RETURNING *`, [id]);
  return rows[0];
}

// Slugs de la sede que son "base" o "base-<algo>" (candidatos a chocar con un slug nuevo).
// "excluirId": la fila que se está editando, que puede conservar su propio slug.
export async function slugsOcupados(tabla, { sedeId, base, excluirId = null }, db = { consultar }) {
  const patron = `${base.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}-%`;
  const { rows } = await db.consultar(
    `SELECT slug FROM ${tabla}
      WHERE sede_id = $1 AND (slug = $2 OR slug LIKE $3 ESCAPE '\\')
        AND ($4::int IS NULL OR id <> $4)`,
    [sedeId, base, patron, excluirId],
  );
  return rows.map((fila) => fila.slug);
}

// ¿Existe una sede con ese id? (para el sedeId que manda el Administrador al crear).
export async function sedeExiste(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return rows.length > 0;
}

// Archivos de la biblioteca de una sede, por id o por clave (la "url" guardada).
// Devuelve [{ id, url, tipo_mime, texto_alternativo }].
export async function archivosDeLaSede({ sedeId, ids = [], claves = [] }, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT id, url, tipo_mime, texto_alternativo
       FROM archivo_multimedia
      WHERE sede_id = $1 AND (id = ANY($2::int[]) OR url = ANY($3::text[]))`,
    [sedeId, ids, claves],
  );
  return rows;
}
