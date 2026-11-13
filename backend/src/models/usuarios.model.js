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

const COLUMNAS_ADMIN = `
  u.id,
  u.nombre_completo,
  u.correo,
  u.activo,
  u.fecha_ultimo_acceso,
  u.fecha_creacion,
  r.nombre AS rol_nombre,
  s.id     AS sede_id,
  s.nombre AS sede_nombre,
  s.slug   AS sede_slug`;

const UNIONES_ADMIN = `
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  LEFT JOIN sede s ON s.id = u.sede_id`;

function construirFiltrosAdmin({ rolNombres, sedeSlug, activo, patron, sinAcentos }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (rolNombres !== undefined) {
    condiciones.push(`r.nombre = ANY(${agregar(rolNombres)}::text[])`);
  }
  if (sedeSlug !== undefined) {
    condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  }
  if (activo !== undefined) {
    condiciones.push(`u.activo = ${agregar(activo)}`);
  }
  if (patron !== undefined) {
    const p = agregar(patron);
    condiciones.push(
      `(${sinAcentos('u.nombre_completo')} ILIKE ${p} OR ${sinAcentos('u.correo')} ILIKE ${p})`,
    );
  }

  return { where: condiciones.join(' AND '), parametros };
}

export async function listarAdmin(
  { rolNombres, sedeSlug, activo, patron, sinAcentos, orden, limite, desplazamiento },
  db = { consultar },
) {
  const { where, parametros } = construirFiltrosAdmin({
    rolNombres,
    sedeSlug,
    activo,
    patron,
    sinAcentos,
  });

  const direccion = orden === '-nombreCompleto' ? 'DESC' : 'ASC';
  const orderBy = `u.nombre_completo ${direccion}, u.id ${direccion}`;

  const { rows: conteo } = await db.consultar(
    `SELECT COUNT(*)::int AS total ${UNIONES_ADMIN} WHERE ${where}`,
    parametros,
  );
  const total = conteo[0].total;

  const limitParam = `$${parametros.length + 1}`;
  const offsetParam = `$${parametros.length + 2}`;
  const { rows: filas } = await db.consultar(
    `SELECT ${COLUMNAS_ADMIN}
     ${UNIONES_ADMIN}
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    [...parametros, limite, desplazamiento],
  );

  return { filas, total };
}

export async function buscarDetalleAdmin(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE u.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT u.*, r.nombre AS rol_nombre
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
      WHERE u.id = $1
      FOR UPDATE OF u`,
    [id],
  );
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function existeOtroCorreo(correo, excluirId = null, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT id FROM usuario WHERE lower(correo) = lower($1) AND ($2::int IS NULL OR id <> $2)',
    [correo, excluirId],
  );
  return Boolean(rows[0]);
}

export async function contarAdminsActivosExcluyendo(rolAdminNombre, usuarioId, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT COUNT(*)::int AS total
       FROM usuario u
       JOIN rol r ON r.id = u.rol_id
      WHERE r.nombre = $1 AND u.activo AND u.id <> $2`,
    [rolAdminNombre, usuarioId],
  );
  return rows[0].total;
}

export async function crearAdmin(
  { rolNombre, sedeId = null, nombreCompleto, correo, hashContrasena, activo = true },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena, activo)
     SELECT r.id, $2, $3, $4, $5, $6
       FROM rol r
      WHERE r.nombre = $1
     RETURNING *`,
    [rolNombre, sedeId, nombreCompleto, correo, hashContrasena, activo],
  );
  return rows[0];
}

export async function obtenerRolIdPorNombre(nombre, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM rol WHERE nombre = $1', [nombre]);
  return rows[0]?.id ?? null;
}

const COLUMNAS_ACTUALIZABLES = {
  rolId: 'rol_id',
  sedeId: 'sede_id',
  nombreCompleto: 'nombre_completo',
  correo: 'correo',
  activo: 'activo',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const entradas = Object.entries(cambios).filter(
    ([clave, valor]) => clave in COLUMNAS_ACTUALIZABLES && valor !== undefined,
  );
  if (entradas.length === 0) {
    const { rows } = await db.consultar('SELECT * FROM usuario WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  const asignaciones = entradas.map(
    ([clave], indice) => `${COLUMNAS_ACTUALIZABLES[clave]} = $${indice + 2}`,
  );
  const valores = entradas.map(([, valor]) => valor);

  const { rows } = await db.consultar(
    `UPDATE usuario SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...valores],
  );
  return rows[0];
}
