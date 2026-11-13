// Controladores HTTP de /api/auth: leen la petición, ponen o borran la cookie y responden.
import * as servicio from '../services/auth.service.js';
import { conLimiteDeIntentos } from '../services/limiteIntentos.service.js';
import { borrarCookieSesion, establecerCookieSesion } from '../utils/sesion.js';

// Las respuestas traen datos de la sesión: no deben quedar en ninguna caché.
const SIN_CACHE = 'no-store';

// Intento fallido de inicio de sesión: credenciales incorrectas (correo, contraseña o usuario inactivo).
const esLoginFallido = (error) => error.codigo === 'NO_AUTENTICADO';

// Intento fallido de cambio de contraseña: la contraseña actual no es la correcta.
const esCambioFallido = (error) =>
  error.codigo === 'VALIDACION' &&
  error.detalles?.some((detalle) => detalle.campo === 'contrasenaActual');

export async function login(req, res) {
  const { correo, contrasena } = req.validado.body;

  const { token, duracionSegundos, usuario } = await conLimiteDeIntentos(
    { ip: req.ip, correo, log: req.log },
    () => servicio.iniciarSesion({ correo, contrasena }),
    esLoginFallido,
  );

  establecerCookieSesion(res, token, duracionSegundos);
  req.log.info({ usuarioId: usuario.id }, 'Inicio de sesión');

  res.set('Cache-Control', SIN_CACHE).json({ datos: usuario });
}

// Idempotente: borra la cookie aunque no haya sesión.
export function logout(_req, res) {
  borrarCookieSesion(res);
  res.set('Cache-Control', SIN_CACHE).status(204).end();
}

export function yo(req, res) {
  const { fila, sesionExpiraEn } = req.usuario;

  res
    .set('Cache-Control', SIN_CACHE)
    .json({ datos: servicio.aUsuarioSesion(fila, sesionExpiraEn) });
}

// Comparte el límite de intentos con el login: mismos contadores, por IP y correo del usuario.
export async function cambiarContrasena(req, res) {
  await conLimiteDeIntentos(
    { ip: req.ip, correo: req.usuario.fila.correo, log: req.log },
    () => servicio.cambiarContrasena({ usuarioId: req.usuario.id, ...req.validado.body }),
    esCambioFallido,
  );

  req.log.info({ usuarioId: req.usuario.id }, 'Cambio de contraseña');
  res.set('Cache-Control', SIN_CACHE).status(204).end();
}
