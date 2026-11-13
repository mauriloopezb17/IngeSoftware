// Controladores HTTP de usuarios en el panel CMS (/api/admin/usuarios).
import * as servicio from '../services/adminUsuarios.service.js';
import { contextoDe } from '../services/bitacora.service.js';

export async function listar(req, res) {
  const resultado = await servicio.listarUsuarios(req.validado.query);
  res.json(resultado);
}

export async function detalle(req, res) {
  const datos = await servicio.obtenerUsuario(req.validado.params.id);
  res.json({ datos });
}

export async function crear(req, res) {
  const datos = await servicio.crearUsuario(req.validado.body, contextoDe(req));
  res.status(201).location(`/api/admin/usuarios/${datos.id}`).json({ datos });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarUsuario(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
    contextoDe(req),
  );
  res.json({ datos });
}

export async function restablecerContrasena(req, res) {
  await servicio.restablecerContrasena(
    req.validado.params.id,
    req.validado.body.contrasenaNueva,
    contextoDe(req),
  );
  res.status(204).end();
}
