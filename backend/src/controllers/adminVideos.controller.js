// Controladores HTTP de videos de YouTube en el panel CMS (/api/admin/videos).
import * as servicio from '../services/adminVideos.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  const datos = await servicio.listarVideos(req.sedeFiltro, req.validado.query);
  res.json({ datos });
}

export async function detalle(req, res) {
  const datos = await servicio.obtenerVideo(req.usuario, req.validado.params.id);
  res.json({ datos });
}

export async function crear(req, res) {
  const datos = await servicio.crearVideo(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/videos/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarVideo(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarVideo(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}

export async function reordenar(req, res) {
  const datos = await servicio.reordenarVideos(req.usuario, req.validado.body.ids, contextoDe(req));
  res.json({ datos });
}
