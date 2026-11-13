// Controladores HTTP de páginas con bloques. Las lecturas pasan por la caché de Redis.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as servicio from '../services/paginas.service.js';

export async function listar(req, res) {
  const clave = { recurso: RECURSOS_CACHE.PAGINAS, sedeId: req.sede.id, variante: 'menu' };
  await responderConCache(req, res, clave, async () => ({
    datos: await servicio.listarPaginasDelMenu(req.sede.id),
  }));
}

export async function detalle(req, res) {
  const { slug } = req.params;
  const clave = { recurso: RECURSOS_CACHE.PAGINAS, sedeId: req.sede.id, variante: { slug } };
  await responderConCache(req, res, clave, async () => ({
    datos: await servicio.obtenerPagina(req.sede.id, slug),
  }));
}
