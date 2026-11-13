// Token de sesión (JWT) y su cookie (docs/api/autenticacion.md, sección 1).
// Nunca se registran en el log: el token equivale a la contraseña mientras dura la sesión.
import jwt from 'jsonwebtoken';
import { obtenerEntorno } from '../config/entorno.js';

export const NOMBRE_COOKIE_SESION = 'parroquia_sesion';

const ALGORITMO = 'HS256';
const SEGUNDOS_POR_UNIDAD = { s: 1, m: 60, h: 3_600, d: 86_400 };

// "8h" -> 28800. JWT_EXPIRA_EN ya fue validada por entorno.js (número y unidad s, m, h o d).
export function duracionEnSegundos(duracion) {
  return Number.parseInt(duracion, 10) * SEGUNDOS_POR_UNIDAD[duracion.slice(-1)];
}

// Firma el token de un usuario: { sub, rol, sede, iat, exp }. "rol" es el código de la API
// (SECRETARIA) y "sede" el id de la sede o null. Devuelve también cuándo vence y cuánto dura.
export function firmarToken({ id, rol, sede }) {
  const { jwt: configuracion } = obtenerEntorno();
  const duracionSegundos = duracionEnSegundos(configuracion.expiraEn);

  const token = jwt.sign({ rol, sede }, configuracion.secreto, {
    algorithm: ALGORITMO,
    subject: String(id),
    expiresIn: duracionSegundos,
  });
  const { exp } = jwt.decode(token);

  return { token, duracionSegundos, expiraEn: new Date(exp * 1000) };
}

// Devuelve el contenido del token si la firma y el vencimiento son válidos; si no, null.
// Solo acepta HS256: así no sirve un token sin firma ("alg: none") ni firmado con otro algoritmo.
export function verificarToken(token) {
  try {
    return jwt.verify(token, obtenerEntorno().jwt.secreto, { algorithms: [ALGORITMO] });
  } catch {
    return null;
  }
}

// Atributos de la cookie: HttpOnly (el JavaScript del panel no la lee), SameSite=Lax,
// Path=/api y Secure solo en producción (en desarrollo se usa http://localhost).
function atributosCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: obtenerEntorno().esProduccion,
    path: '/api',
  };
}

export function establecerCookieSesion(res, token, duracionSegundos) {
  res.cookie(NOMBRE_COOKIE_SESION, token, {
    ...atributosCookie(),
    maxAge: duracionSegundos * 1000,
  });
}

// Max-Age=0: el navegador la borra. Los atributos deben ser los mismos con que se creó.
export function borrarCookieSesion(res) {
  res.cookie(NOMBRE_COOKIE_SESION, '', { ...atributosCookie(), maxAge: 0 });
}
