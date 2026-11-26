// Controlador HTTP de horarios. La lectura pasa por la caché de Redis.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as servicio from '../services/horarios.service.js';

export async function listar(req, res) {
  const { query } = req.validado;
  const clave = { recurso: RECURSOS_CACHE.HORARIOS, sedeId: req.sede.id, variante: query };
  await responderConCache(req, res, clave, () => servicio.listarHorarios(req.sede.id, query));
}
