// Controladores HTTP de publicaciones del portal. Las lecturas pasan por la caché de Redis.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as servicio from '../services/publicaciones.service.js';

export async function listar(req, res) {
  const { query } = req.validado;
  const clave = {
    recurso: RECURSOS_CACHE.PUBLICACIONES,
    sedeId: req.sede.id,
    variante: { lista: query },
  };
  // La lista paginada ya trae { datos, paginacion }.
  await responderConCache(req, res, clave, () => servicio.listarPublicaciones(req.sede.id, query));
}

export async function detalle(req, res) {
  const { slug } = req.params;
  const clave = { recurso: RECURSOS_CACHE.PUBLICACIONES, sedeId: req.sede.id, variante: { slug } };
  await responderConCache(req, res, clave, async () => ({
    datos: await servicio.obtenerPublicacion(req.sede.id, slug),
  }));
}
