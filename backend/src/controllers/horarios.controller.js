// Controlador HTTP de horarios.
import * as servicio from '../services/horarios.service.js';

export async function listar(req, res) {
  const { tipo } = req.validado.query;
  res.json({ datos: await servicio.listarHorarios(req.sede.id, tipo ?? null) });
}
