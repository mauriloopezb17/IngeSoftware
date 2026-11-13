// Controladores HTTP de /api/auth: leen la petición, ponen o borran la cookie y responden.
import * as servicio from '../services/auth.service.js';
import { establecerCookieSesion } from '../utils/sesion.js';

export async function login(req, res) {
  const { token, duracionSegundos, usuario } = await servicio.iniciarSesion(req.validado.body);

  establecerCookieSesion(res, token, duracionSegundos);
  req.log.info({ usuarioId: usuario.id }, 'Inicio de sesión');

  // La respuesta trae datos de la sesión: no debe quedar en ninguna caché.
  res.set('Cache-Control', 'no-store').json({ datos: usuario });
}
