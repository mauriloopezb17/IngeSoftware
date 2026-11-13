// Controladores HTTP de servicios y preguntas frecuentes en el panel CMS (/api/admin/servicios).
import * as servicio from '../services/adminServicios.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  const datos = await servicio.listarServicios(req.sedeFiltro, req.validado.query);
  res.json({ datos });
}

export async function detalle(req, res) {
  const datos = await servicio.obtenerServicio(req.usuario, req.validado.params.id);
  res.json({ datos });
}

export async function crear(req, res) {
  const datos = await servicio.crearServicio(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/servicios/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarServicio(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarServicio(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}

export async function reordenar(req, res) {
  const datos = await servicio.reordenarServicios(
    req.usuario,
    req.validado.body.ids,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function crearPregunta(req, res) {
  const { id } = req.validado.params;
  const datos = await servicio.crearPreguntaFrecuente(
    req.usuario,
    id,
    req.validado.body,
    contextoDe(req),
  );
  res.status(201).location(`/api/admin/servicios/${id}/preguntas-frecuentes/${datos.id}`).json({
    datos,
  });
}

export async function editarPregunta(req, res) {
  const { id, preguntaId } = req.validado.params;
  const datos = await servicio.actualizarPreguntaFrecuente(
    req.usuario,
    id,
    preguntaId,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminarPregunta(req, res) {
  const { id, preguntaId } = req.validado.params;
  await servicio.eliminarPreguntaFrecuente(req.usuario, id, preguntaId, contextoDe(req));
  res.status(204).end();
}

export async function reordenarPreguntas(req, res) {
  const { id } = req.validado.params;
  const datos = await servicio.reordenarPreguntasFrecuentes(
    req.usuario,
    id,
    req.validado.body.ids,
    contextoDe(req),
  );
  res.json({ datos });
}
