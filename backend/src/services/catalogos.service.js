// Catálogos globales del portal (contrato: docs/api/publico.md).
import * as modelo from '../models/catalogos.model.js';

// GET /api/categorias
export async function listarCategorias() {
  return (await modelo.listarCategorias()).map(({ id, nombre, slug }) => ({ id, nombre, slug }));
}

// GET /api/categorias-evento
export async function listarCategoriasEvento() {
  return (await modelo.listarCategoriasEvento()).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    colorHex: fila.color_hex,
  }));
}
