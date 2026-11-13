// Controladores HTTP de páginas con bloques.
import * as servicio from '../services/paginas.service.js';

export async function listar(req, res) {
  res.json({ datos: await servicio.listarPaginasDelMenu(req.sede.id) });
}

export async function detalle(req, res) {
  res.json({ datos: await servicio.obtenerPagina(req.sede.id, req.params.slug) });
}
