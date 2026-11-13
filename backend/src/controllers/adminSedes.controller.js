// Controladores HTTP de sedes y redes sociales en el panel CMS (/api/admin/sedes).
import * as servicio from '../services/adminSedes.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  const datos = await servicio.listarSedes(req.usuario);
  res.json({ datos });
}

export async function detalle(req, res) {
  const datos = await servicio.obtenerSede(req.usuario, req.validado.params.id);
  res.json({ datos });
}

export async function crear(req, res) {
  const datos = await servicio.crearSede(req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/sedes/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarSede(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}
