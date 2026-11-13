// Usuarios temporales para las pruebas de autenticación: así no se modifican los del seed
// (el login actualiza fecha_ultimo_acceso). Cada archivo de pruebas llama a borrarUsuariosDePrueba().
import { randomUUID } from 'node:crypto';
import { consultar } from '../../src/db/index.js';
import { ROLES } from '../../src/constantes/catalogos.js';
import { hashearContrasena } from '../../src/utils/contrasenas.js';

// Contraseña de los usuarios de prueba (no es una credencial real).
export const CONTRASENA_DE_PRUEBA = 'Exaltacion-Obrajes-167';

export const SEDE_PRINCIPAL = 'senor-de-la-exaltacion';

// Calcular un hash argon2id cuesta decenas de milisegundos: se hace una sola vez.
let hashDePrueba;

const idsCreados = [];

// rol: código de la API (SECRETARIA). sede: slug o null. Devuelve { id, correo, contrasena }.
export async function crearUsuarioDePrueba({
  rol = 'SECRETARIA',
  sede = SEDE_PRINCIPAL,
  activo = true,
} = {}) {
  hashDePrueba ??= await hashearContrasena(CONTRASENA_DE_PRUEBA);
  const correo = `prueba-${randomUUID()}@parroquia.test`;

  const { rows } = await consultar(
    `INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena, activo)
     VALUES (
       (SELECT id FROM rol WHERE nombre = $1),
       (SELECT id FROM sede WHERE slug = $2),
       $3, $4, $5, $6
     )
     RETURNING id`,
    [ROLES.nombreDe(rol), sede, `Usuario de prueba (${rol})`, correo, hashDePrueba, activo],
  );

  idsCreados.push(rows[0].id);
  return { id: rows[0].id, correo, contrasena: CONTRASENA_DE_PRUEBA };
}

export async function borrarUsuariosDePrueba() {
  if (idsCreados.length === 0) return;
  await consultar('DELETE FROM usuario WHERE id = ANY($1)', [idsCreados.splice(0)]);
}
