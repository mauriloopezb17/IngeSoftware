// Controladores HTTP de los catálogos globales.
import * as servicio from '../services/catalogos.service.js';

export async function listarCategorias(_req, res) {
  res.json({ datos: await servicio.listarCategorias() });
}

export async function listarCategoriasEvento(_req, res) {
  res.json({ datos: await servicio.listarCategoriasEvento() });
}
