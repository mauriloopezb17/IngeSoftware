// Controladores HTTP de /api/admin/paginas y de sus bloques.
import * as servicio from '../services/adminPaginas.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  res.json({ datos: await servicio.listarPaginas(req.sedeFiltro, req.validado.query) });
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerPagina(req.usuario, req.validado.params.id) });
}

export async function crear(req, res) {
  const datos = await servicio.crearPagina(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/paginas/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.editarPagina(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarPagina(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}

export async function agregarBloque(req, res) {
  const { id } = req.validado.params;
  const datos = await servicio.agregarBloque(req.usuario, id, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/paginas/${id}/bloques/${datos.id}`).json({ datos });
}

export async function editarBloque(req, res) {
  const { id, bloqueId } = req.validado.params;
  const datos = await servicio.editarBloque(
    req.usuario,
    id,
    bloqueId,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminarBloque(req, res) {
  const { id, bloqueId } = req.validado.params;
  await servicio.eliminarBloque(req.usuario, id, bloqueId, contextoDe(req));
  res.status(204).end();
}

export async function reordenarBloques(req, res) {
  const datos = await servicio.reordenarBloques(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}
