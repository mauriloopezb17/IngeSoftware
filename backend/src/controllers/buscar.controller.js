// Controlador HTTP de GET /api/sedes/:sede/buscar (OLA-2.md §2).
import { RECURSOS_CACHE } from '../constantes/cache.js';
import * as servicio from '../services/buscar.service.js';
import { cacheActiva, leerConCache, obtenerGeneraciones } from '../services/cache.service.js';

const RECURSOS_INDEXADOS = [
  RECURSOS_CACHE.PUBLICACIONES,
  RECURSOS_CACHE.EVENTOS,
  RECURSOS_CACHE.SERVICIOS,
  RECURSOS_CACHE.GRUPOS,
  RECURSOS_CACHE.BOLETINES,
  RECURSOS_CACHE.PAGINAS,
];

export async function buscar(req, res) {
  const { query } = req.validado;
  const versiones = await obtenerGeneraciones(req.sede.id, RECURSOS_INDEXADOS);

  const { valor, acierto, sinRedis } = await leerConCache(
    {
      recurso: RECURSOS_CACHE.BUSQUEDA,
      sedeId: req.sede.id,
      variante: { ...query, v: versiones },
      log: req.log,
    },
    () => servicio.buscarEnSede(req.sede.id, query),
  );

  if (cacheActiva()) {
    res.set('X-Cache', sinRedis ? 'BYPASS' : acierto ? 'HIT' : 'MISS');
  }
  req.extraConsulta = { total: valor.paginacion.total, cache: acierto };
  res.json(valor);
}
