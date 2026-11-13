// Controladores HTTP del contenido pastoral de una sede: servicios, grupos pastorales y videos.
import * as grupos from '../services/gruposPastorales.service.js';
import * as servicios from '../services/servicios.service.js';
import * as videos from '../services/videos.service.js';

export async function listarServicios(req, res) {
  res.json({ datos: await servicios.listarServicios(req.sede.id) });
}

export async function detalleServicio(req, res) {
  res.json({ datos: await servicios.obtenerServicio(req.sede.id, req.params.slug) });
}

export async function listarGruposPastorales(req, res) {
  res.json({ datos: await grupos.listarGruposPastorales(req.sede.id) });
}

export async function listarVideos(req, res) {
  res.json({ datos: await videos.listarVideos(req.sede.id) });
}
