// Controladores HTTP de horarios en el panel CMS (/api/admin/horarios).
import * as servicio from '../services/adminHorarios.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  const datos = await servicio.listarHorarios(req.sedeFiltro, req.validado.query);
  res.json({ datos });
}

export async function detalle(req, res) {
  const datos = await servicio.obtenerHorario(req.usuario, req.validado.params.id);
  res.json({ datos });
}

export async function crear(req, res) {
  const datos = await servicio.crearHorario(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/horarios/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarHorario(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarHorario(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}
