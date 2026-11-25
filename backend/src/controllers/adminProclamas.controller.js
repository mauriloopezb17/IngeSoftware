// Controladores HTTP de /api/admin/proclamas.
import * as servicio from '../services/adminProclamas.service.js';
import { contextoDe } from '../services/bitacora.service.js';
import * as observaciones from '../services/observacionesProclama.service.js';

export async function listar(req, res) {
  res.json(await servicio.listarProclamas(req.sedeFiltro, req.validado.query));
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerProclama(req.usuario, req.validado.params.id) });
}

export async function crear(req, res) {
  const datos = await servicio.crearProclama(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/proclamas/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const { id } = req.validado.params;
  res.json({
    datos: await servicio.editarProclama(req.usuario, id, req.validado.body, contextoDe(req)),
  });
}

export async function editarDetalle(req, res) {
  const { id } = req.validado.params;
  res.json({
    datos: await servicio.editarDetalleProclama(
      req.usuario,
      id,
      req.validado.body,
      contextoDe(req),
    ),
  });
}

export async function eliminar(req, res) {
  await servicio.eliminarProclama(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}

export async function agregarPublicacion(req, res) {
  const { id } = req.validado.params;
  const datos = await servicio.agregarPublicacion(
    req.usuario,
    id,
    req.validado.body,
    contextoDe(req),
  );
  res.status(201).location(`/api/admin/proclamas/${id}`).json({ datos });
}

export async function cambiarPublicacion(req, res) {
  const { id, numero } = req.validado.params;
  res.json({
    datos: await servicio.cambiarPublicacion(
      req.usuario,
      id,
      numero,
      req.validado.body,
      contextoDe(req),
    ),
  });
}

export async function quitarPublicacion(req, res) {
  const { id, numero } = req.validado.params;
  res.json({
    datos: await servicio.quitarPublicacion(req.usuario, id, numero, contextoDe(req)),
  });
}

export async function listarObservaciones(req, res) {
  res.json(await observaciones.listarObservaciones(req.usuario.sedeId, req.validado.query));
}

export async function resumenObservaciones(req, res) {
  res.json({ datos: await observaciones.resumenObservaciones(req.usuario.sedeId) });
}

export async function marcarObservacion(req, res) {
  const { id } = req.validado.params;
  res.json({
    datos: await observaciones.marcarObservacion(req.usuario, id, req.validado.body),
  });
}

export async function eliminarObservacion(req, res) {
  await observaciones.eliminarObservacion(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}
