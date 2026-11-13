// Consultas de usuarios del panel (SQL parametrizado).
import { consultar } from '../db/index.js';

// Usuario con su rol y su sede (si tiene), para armar la sesión. La sede puede ser null.
const SELECCION_SESION = `
  SELECT u.id,
         u.nombre_completo,
         u.correo,
         u.hash_contrasena,
         u.activo,
         u.fecha_ultimo_acceso,
         r.nombre AS rol_nombre,
         s.id     AS sede_id,
         s.nombre AS sede_nombre,
         s.slug   AS sede_slug
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    LEFT JOIN sede s ON s.id = u.sede_id`;

// Busca por correo sin distinguir mayúsculas (el que llama pasa el correo en minúsculas).
export async function buscarPorCorreo(correoEnMinusculas) {
  const { rows } = await consultar(`${SELECCION_SESION} WHERE lower(u.correo) = $1`, [
    correoEnMinusculas,
  ]);
  return rows[0];
}

// Anota el acceso y devuelve la fecha registrada (timestamptz como Date).
export async function registrarAcceso(id) {
  const { rows } = await consultar(
    'UPDATE usuario SET fecha_ultimo_acceso = now() WHERE id = $1 RETURNING fecha_ultimo_acceso',
    [id],
  );
  return rows[0].fecha_ultimo_acceso;
}

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
