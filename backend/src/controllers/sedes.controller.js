// Controladores HTTP de sedes: leen la petición y responden con el envoltorio "datos".
// Las lecturas pasan por la caché de Redis (services/cache.service.js).
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as servicio from '../services/sedes.service.js';

export async function listar(req, res) {
  const clave = { recurso: RECURSOS_CACHE.SEDES, variante: 'lista' };
  await responderConCache(req, res, clave, async () => ({ datos: await servicio.listarSedes() }));
}

export async function detalle(req, res) {
  const clave = { recurso: RECURSOS_CACHE.SEDE, sedeId: req.sede.id };
  await responderConCache(req, res, clave, async () => ({
    datos: await servicio.obtenerSede(req.sede.id),
  }));
}
