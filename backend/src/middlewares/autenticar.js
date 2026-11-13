// Exige una sesión válida. Deja en req.usuario al usuario de la sesión, leído de la base:
//   { id, rol (código, ej. "SECRETARIA"), sedeId (id o null), sesionExpiraEn, fila }
// "fila" es el registro para armar la respuesta de /auth/yo (nunca trae el hash de la contraseña).
// Sin sesión válida responde 401 NO_AUTENTICADO y, si había cookie, la borra.
import { autenticarToken } from '../services/auth.service.js';
import { borrarCookieSesion, NOMBRE_COOKIE_SESION } from '../utils/sesion.js';

export async function autenticar(req, res, next) {
  const token = req.cookies?.[NOMBRE_COOKIE_SESION];

  try {
    const { fila, rol, sedeId, sesionExpiraEn } = await autenticarToken(token);
    req.usuario = { id: fila.id, rol, sedeId, sesionExpiraEn, fila };
    next();
  } catch (error) {
    if (token) borrarCookieSesion(res);
    next(error);
  }
}
