// Contraseñas de los usuarios del panel (docs/api/autenticacion.md, sección 3).
// Se guardan con argon2id (RNF-02). Nunca se registran en el log ni se devuelven en una respuesta.
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { z } from 'zod';
import '../config/zod.js';

export const LARGO_MINIMO_CONTRASENA = 10;
export const LARGO_MAXIMO_CONTRASENA = 200;

// Mismos parámetros que los hashes del seed (database/seed): argon2id, 64 MiB, 3 pasadas, 4 hilos.
const OPCIONES_ARGON2 = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
});

// Regla de toda contraseña nueva (creación de usuario y cambio de contraseña).
export const contrasenaNueva = z
  .string({ error: 'Debe ser un texto.' })
  .min(LARGO_MINIMO_CONTRASENA, `Debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`)
  .max(LARGO_MAXIMO_CONTRASENA, `Debe tener como máximo ${LARGO_MAXIMO_CONTRASENA} caracteres.`);

// Devuelve el hash argon2id (con su sal aleatoria) para guardarlo en usuario.hash_contrasena.
export function hashearContrasena(contrasena) {
  return argon2.hash(contrasena, OPCIONES_ARGON2);
}

// Compara en tiempo constante (la comparación la hace argon2). Un hash dañado cuenta como
// contraseña incorrecta: nunca lanza un error que revele el estado de la cuenta.
export async function verificarContrasena(contrasena, hash) {
  try {
    return await argon2.verify(hash, contrasena);
  } catch {
    return false;
  }
}

// Hash de una contraseña aleatoria que nadie conoce, con los mismos parámetros que los reales.
// Se calcula al cargar el módulo para que la primera consulta no sea más rápida que las demás.
const hashFicticio = hashearContrasena(randomBytes(32).toString('hex'));
hashFicticio.catch(() => {});

// Para un correo que no existe: hace el mismo trabajo que una verificación real y devuelve
// siempre false. Así el tiempo de respuesta no revela qué correos están registrados.
export async function verificarContrasenaFicticia(contrasena) {
  await verificarContrasena(contrasena, await hashFicticio);
  return false;
}
