// Controladores HTTP de sedes: leen la petición y responden con el envoltorio "datos".
import * as servicio from '../services/sedes.service.js';

export async function listar(_req, res) {
  res.json({ datos: await servicio.listarSedes() });
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerSede(req.sede.id) });
}
