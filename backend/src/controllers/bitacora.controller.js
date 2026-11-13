// Controlador HTTP de /api/admin/bitacora.
import * as servicio from '../services/bitacora.service.js';

export async function listar(req, res) {
  // La lista paginada ya trae { datos, paginacion }.
  res.json(await servicio.listarCambios(req.usuario, req.validado.query));
}
