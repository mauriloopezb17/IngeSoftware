// Controladores HTTP de /api/admin/eventos.
import * as servicio from '../services/adminEventos.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  res.json(await servicio.listarEventos(req.sedeFiltro, req.validado.query));
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerEvento(req.usuario, req.validado.params.id) });
}

export async function crear(req, res) {
  const datos = await servicio.crearEvento(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/eventos/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.editarEvento(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarEvento(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}
