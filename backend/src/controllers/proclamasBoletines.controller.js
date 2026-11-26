// Controladores HTTP de proclamas matrimoniales y boletines. Las lecturas pasan por la caché.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as boletines from '../services/boletines.service.js';
import * as observaciones from '../services/observacionesProclama.service.js';
import * as proclamas from '../services/proclamas.service.js';

export async function listarProclamasVigentes(req, res) {
  const { query } = req.validado;
  const clave = {
    recurso: RECURSOS_CACHE.PROCLAMAS,
    sedeId: req.sede.id,
    variante: { vigentes: query },
  };
  await responderConCache(req, res, clave, () =>
    proclamas.listarProclamasVigentes(req.sede.id, query),
  );
}

export async function listarHistorialProclamas(req, res) {
  const { query } = req.validado;
  const clave = {
    recurso: RECURSOS_CACHE.PROCLAMAS,
    sedeId: req.sede.id,
    variante: { historial: query },
  };
  // Las listas paginadas ya traen { datos, paginacion }.
  await responderConCache(req, res, clave, () =>
    proclamas.listarHistorialProclamas(req.sede.id, query),
  );
}

export async function detalleProclama(req, res) {
  const { id } = req.validado.params;
  const clave = {
    recurso: RECURSOS_CACHE.PROCLAMAS,
    sedeId: req.sede.id,
    variante: { detalle: id },
  };
  await responderConCache(req, res, clave, async () => ({
    datos: await proclamas.obtenerDetalleProclama(req.sede.id, id),
  }));
}

export async function crearObservacion(req, res) {
  const { id } = req.validado.params;
  const datos = await observaciones.crearObservacionPublica(req.sede.id, id, req.validado.body);
  res.set('Cache-Control', 'no-store').status(201).json({ datos });
}

export async function listarBoletines(req, res) {
  const { query } = req.validado;
  const clave = { recurso: RECURSOS_CACHE.BOLETINES, sedeId: req.sede.id, variante: query };
  await responderConCache(req, res, clave, () => boletines.listarBoletines(req.sede.id, query));
}
