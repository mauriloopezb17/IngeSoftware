// Controladores HTTP de publicaciones del portal.
import * as servicio from '../services/publicaciones.service.js';

export async function listar(req, res) {
  // La lista paginada ya trae { datos, paginacion }.
  res.json(await servicio.listarPublicaciones(req.sede.id, req.validado.query));
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerPublicacion(req.sede.id, req.params.slug) });
}
