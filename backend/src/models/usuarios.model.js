// Consultas de usuarios del panel (SQL parametrizado).
import { consultar } from '../db/index.js';

// Inserta un usuario. El rol se identifica por su nombre (tabla rol), nunca por id.
// "db" permite ejecutarlo dentro de una transacción: transaccion(({ consultar }) => crear(datos, { consultar })).
// Devuelve la fila creada, o undefined si el rol no existe. Un correo repetido lanza el error 23505 de pg.
export async function crear(
  { rolNombre, sedeId = null, nombreCompleto, correo, hashContrasena },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena)
     SELECT r.id, $2, $3, $4, $5
       FROM rol r
      WHERE r.nombre = $1
     RETURNING id, nombre_completo, correo, sede_id`,
    [rolNombre, sedeId, nombreCompleto, correo, hashContrasena],
  );
  return rows[0];
}
