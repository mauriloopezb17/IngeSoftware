// Controladores HTTP de grupos pastorales en el panel CMS (/api/admin/grupos-pastorales).
import * as servicio from '../services/adminGrupos.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  const datos = await servicio.listarGrupos(req.sedeFiltro, req.validado.query);
  res.json({ datos });
}

export async function detalle(req, res) {
  const datos = await servicio.obtenerGrupo(req.usuario, req.validado.params.id);
  res.json({ datos });
}

export async function crear(req, res) {
  const datos = await servicio.crearGrupo(req.usuario, req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/grupos-pastorales/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarGrupo(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarGrupo(req.usuario, req.validado.params.id, contextoDe(req));
  res.status(204).end();
}

export async function reordenar(req, res) {
  const datos = await servicio.reordenarGrupos(req.usuario, req.validado.body.ids, contextoDe(req));
  res.json({ datos });
}
