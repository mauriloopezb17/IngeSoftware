// Consultas de usuarios del panel (SQL parametrizado).
import { consultar } from '../db/index.js';

// Usuario con su rol y su sede (si tiene), para armar la sesión. La sede puede ser null.
// "columnasExtra" agrega columnas al SELECT (ej. el hash, solo donde hace falta).
const seleccionSesion = (columnasExtra = '') => `
  SELECT u.id,
         u.nombre_completo,
         u.correo,
         u.activo,
         u.fecha_ultimo_acceso,
         r.nombre AS rol_nombre,
         s.id     AS sede_id,
         s.nombre AS sede_nombre,
         s.slug   AS sede_slug${columnasExtra}
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    LEFT JOIN sede s ON s.id = u.sede_id`;

// Busca por correo sin distinguir mayúsculas (el que llama pasa el correo en minúsculas).
// Es la única consulta de sesión que trae el hash de la contraseña, para verificar el login.
export async function buscarPorCorreo(correoEnMinusculas) {
  const { rows } = await consultar(
    `${seleccionSesion(', u.hash_contrasena')} WHERE lower(u.correo) = $1`,
    [correoEnMinusculas],
  );
  return rows[0];
}

// Usuario de una sesión abierta (sin el hash). Se lee de la base en cada petición.
export async function buscarPorId(id) {
  const { rows } = await consultar(`${seleccionSesion()} WHERE u.id = $1`, [id]);
  return rows[0];
}

export async function obtenerHashContrasena(id) {
  const { rows } = await consultar('SELECT hash_contrasena FROM usuario WHERE id = $1', [id]);
  return rows[0]?.hash_contrasena;
}

// "db" permite ejecutarlo dentro de una transacción (ej. junto con la bitácora).
export async function actualizarContrasena(id, hashContrasena, db = { consultar }) {
  await db.consultar('UPDATE usuario SET hash_contrasena = $2 WHERE id = $1', [id, hashContrasena]);
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
// Devuelve la fila creada completa (para la bitácora), o undefined si el rol no existe. Un correo repetido lanza el error 23505 de pg.
export async function crear(
  { rolNombre, sedeId = null, nombreCompleto, correo, hashContrasena },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena)
     SELECT r.id, $2, $3, $4, $5
       FROM rol r
      WHERE r.nombre = $1
     RETURNING *`,
    [rolNombre, sedeId, nombreCompleto, correo, hashContrasena],
  );
  return rows[0];
}
