// Controladores HTTP de /api/auth: leen la petición, ponen o borran la cookie y responden.
import * as servicio from '../services/auth.service.js';
import { borrarCookieSesion, establecerCookieSesion } from '../utils/sesion.js';

// Las respuestas traen datos de la sesión: no deben quedar en ninguna caché.
const SIN_CACHE = 'no-store';

export async function login(req, res) {
  const { token, duracionSegundos, usuario } = await servicio.iniciarSesion(req.validado.body);

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

export async function cambiarContrasena(req, res) {
  await servicio.cambiarContrasena({ usuarioId: req.usuario.id, ...req.validado.body });

  req.log.info({ usuarioId: req.usuario.id }, 'Cambio de contraseña');
  res.set('Cache-Control', SIN_CACHE).status(204).end();
}
