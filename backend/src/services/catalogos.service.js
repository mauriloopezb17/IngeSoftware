// Catálogos globales del portal (contrato: docs/api/publico.md).
import {
  ESTADOS_PUBLICACION,
  ROLES,
  TIPOS_PUBLICACION,
  TIPOS_SEDE,
} from '../constantes/catalogos.js';
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

// GET /api/admin/catalogos (docs/api/admin.md, sección 1): todos los catálogos para los
// selectores del panel. Las enumeraciones fijas llevan su código de la API, traducido desde el
// nombre guardado (constantes/catalogos.js); los estados van en el orden del flujo, no por id.
export async function obtenerCatalogosDelPanel() {
  const filas = await modelo.listarCatalogosDelPanel();
  const conCodigo = (catalogo) => (lista) =>
    lista.map(({ id, nombre }) => ({ id, codigo: catalogo.codigoDe(nombre), nombre }));
  const ordenDelFlujo = (estado) => ESTADOS_PUBLICACION.codigos.indexOf(estado.codigo);

  return {
    roles: conCodigo(ROLES)(filas.roles),
    tiposSede: conCodigo(TIPOS_SEDE)(filas.tiposSede),
    estadosPublicacion: conCodigo(ESTADOS_PUBLICACION)(filas.estadosPublicacion).sort(
      (a, b) => ordenDelFlujo(a) - ordenDelFlujo(b),
    ),
    tiposPublicacion: conCodigo(TIPOS_PUBLICACION)(filas.tiposPublicacion),
    categorias: filas.categorias.map(({ id, nombre, slug }) => ({ id, nombre, slug })),
    categoriasEvento: filas.categoriasEvento.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      colorHex: fila.color_hex,
    })),
    tiposHorario: filas.tiposHorario.map(({ id, nombre }) => ({ id, nombre })),
    redesSociales: filas.redesSociales.map(({ id, nombre, icono }) => ({ id, nombre, icono })),
    tiposBloque: filas.tiposBloque.map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.nombre,
      esquemaValidacion: fila.esquema_validacion,
    })),
  };
}
