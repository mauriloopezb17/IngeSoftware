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

// ---- Catálogos del panel (GET /api/admin/catalogos) ----

// Todas las tablas de catálogo, cada una por id. Los esquemas de los bloques van completos.
export async function listarCatalogosDelPanel() {
  const porId = (tabla, columnas) => consultar(`SELECT ${columnas} FROM ${tabla} ORDER BY id`);

  const [
    roles,
    tiposSede,
    estados,
    tiposPublicacion,
    categorias,
    categoriasEvento,
    tiposHorario,
    redes,
    tiposBloque,
  ] = await Promise.all([
    porId('rol', 'id, nombre'),
    porId('tipo_sede', 'id, nombre'),
    porId('estado_publicacion', 'id, nombre'),
    porId('tipo_publicacion', 'id, nombre'),
    porId('categoria', 'id, nombre, slug'),
    porId('categoria_evento', 'id, nombre, color_hex'),
    porId('tipo_horario', 'id, nombre'),
    porId('red_social', 'id, nombre, icono'),
    porId('tipo_bloque', 'id, codigo, nombre, esquema_validacion'),
  ]);

  return {
    roles: roles.rows,
    tiposSede: tiposSede.rows,
    estadosPublicacion: estados.rows,
    tiposPublicacion: tiposPublicacion.rows,
    categorias: categorias.rows,
    categoriasEvento: categoriasEvento.rows,
    tiposHorario: tiposHorario.rows,
    redesSociales: redes.rows,
    tiposBloque: tiposBloque.rows,
  };
}
