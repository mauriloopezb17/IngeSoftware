// Páginas armadas con bloques (contrato: docs/api/publico.md, RF-04).
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/paginas.model.js';
import { formatearFechaHora } from '../utils/formato.js';
import { slug as esquemaSlug } from '../validacion/comunes.js';

const publicado = () => ESTADOS_PUBLICACION.nombreDe('PUBLICADO');

// GET /api/sedes/:sede/paginas: páginas publicadas del menú.
export async function listarPaginasDelMenu(sedeId) {
  const filas = await modelo.listarDelMenu(sedeId, publicado());
  return filas.map((fila) => ({
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    paginaPadreId: fila.pagina_padre_id,
    ordenMenu: fila.orden_menu,
  }));
}

// GET /api/sedes/:sede/paginas/:slug. El contenido de cada bloque se devuelve tal como se guarda
// (claves en snake_case: tienen esquema propio). Una página en borrador o archivada, de otra
// sede o con un slug imposible responde 404.
export async function obtenerPagina(sedeId, slug) {
  const fila = esquemaSlug.safeParse(slug).success
    ? await modelo.obtenerPublicadaPorSlug(sedeId, publicado(), slug)
    : null;

  if (!fila) {
    throw ErrorApp.noEncontrado(`No existe la página «${String(slug).slice(0, 120)}».`);
  }

  return {
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    descripcionSeo: fila.descripcion_seo,
    paginaPadre: fila.pagina_padre,
    fechaActualizacion: formatearFechaHora(fila.fecha_actualizacion),
    bloques: fila.bloques,
  };
}
