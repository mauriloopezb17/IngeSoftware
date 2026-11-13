// Controladores HTTP de la biblioteca multimedia (/api/admin/multimedia).
import * as servicio from '../services/biblioteca.service.js';

export async function listar(req, res) {
  res.json(await servicio.listarArchivos(req.sedeFiltro, req.validado.query));
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerArchivo(req.usuario, req.validado.params.id) });
}

export async function editar(req, res) {
  const datos = await servicio.actualizarArchivo(
    req.usuario,
    req.validado.params.id,
    req.validado.body,
  );
  res.json({ datos });
}

export async function eliminar(req, res) {
  await servicio.eliminarArchivo(req.usuario, req.validado.params.id);
  res.status(204).end();
}
