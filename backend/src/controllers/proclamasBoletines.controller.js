// Controladores HTTP de proclamas matrimoniales y boletines.
import * as boletines from '../services/boletines.service.js';
import * as proclamas from '../services/proclamas.service.js';

export async function listarProclamasVigentes(req, res) {
  res.json({ datos: await proclamas.listarProclamasVigentes(req.sede.id) });
}

export async function listarHistorialProclamas(req, res) {
  // Las listas paginadas ya traen { datos, paginacion }.
  res.json(await proclamas.listarHistorialProclamas(req.sede.id, req.validado.query));
}

export async function listarBoletines(req, res) {
  res.json(await boletines.listarBoletines(req.sede.id, req.validado.query));
}
