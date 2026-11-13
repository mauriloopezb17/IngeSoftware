// Consultas de catálogos globales (no pertenecen a una sede).
import { consultar } from '../db/index.js';

// Categorías de publicaciones, por nombre.
export async function listarCategorias() {
  const { rows } = await consultar('SELECT id, nombre, slug FROM categoria ORDER BY nombre, id');
  return rows;
}

// Categorías del calendario, por id, con su color.
export async function listarCategoriasEvento() {
  const { rows } = await consultar(
    'SELECT id, nombre, color_hex FROM categoria_evento ORDER BY id',
  );
  return rows;
}
