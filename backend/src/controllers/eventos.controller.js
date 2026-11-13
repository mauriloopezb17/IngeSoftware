// Controlador HTTP de eventos del calendario.
import * as servicio from '../services/eventos.service.js';

export async function listar(req, res) {
  // La lista paginada ya trae { datos, paginacion }.
  res.json(await servicio.listarEventos(req.sede.id, req.validado.query));
}
