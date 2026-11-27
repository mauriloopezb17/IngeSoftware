// Controladores HTTP del contenido pastoral de una sede: servicios, grupos pastorales y videos.
// Las lecturas pasan por la caché de Redis.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { responderConCache } from '../services/cache.service.js';
import * as grupos from '../services/gruposPastorales.service.js';
import * as servicios from '../services/servicios.service.js';
import * as videos from '../services/videos.service.js';

export async function listarServicios(req, res) {
  const { query } = req.validado;
  const clave = { recurso: RECURSOS_CACHE.SERVICIOS, sedeId: req.sede.id, variante: query };
  await responderConCache(req, res, clave, () => servicios.listarServicios(req.sede.id, query));
}

export async function detalleServicio(req, res) {
  const { slug } = req.params;
  const clave = { recurso: RECURSOS_CACHE.SERVICIOS, sedeId: req.sede.id, variante: { slug } };
  await responderConCache(req, res, clave, async () => ({
    datos: await servicios.obtenerServicio(req.sede.id, slug),
  }));
}

export async function listarGruposPastorales(req, res) {
  const { query } = req.validado;
  const clave = { recurso: RECURSOS_CACHE.GRUPOS, sedeId: req.sede.id, variante: query };
  await responderConCache(req, res, clave, () => grupos.listarGruposPastorales(req.sede.id, query));
}

export async function detalleGrupoPastoral(req, res) {
  const { slug } = req.params;
  const clave = { recurso: RECURSOS_CACHE.GRUPOS, sedeId: req.sede.id, variante: { slug } };
  await responderConCache(req, res, clave, async () => ({
    datos: await grupos.obtenerGrupoPastoral(req.sede.id, slug),
  }));
}

export async function listarVideos(req, res) {
  const { query } = req.validado;
  const clave = { recurso: RECURSOS_CACHE.VIDEOS, sedeId: req.sede.id, variante: query };
  await responderConCache(req, res, clave, () => videos.listarVideos(req.sede.id, query));
}
