// Controlador HTTP de eventos del calendario. La lectura pasa por la caché de Redis.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as servicio from '../services/eventos.service.js';

export async function listar(req, res) {
  const { query } = req.validado;
  const clave = { recurso: RECURSOS_CACHE.EVENTOS, sedeId: req.sede.id, variante: query };
  // La lista paginada ya trae { datos, paginacion }.
  await responderConCache(req, res, clave, () => servicio.listarEventos(req.sede.id, query));
}
