// Servicios y sacramentos (contrato: docs/api/publico.md).
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/servicios.model.js';
import { slug as esquemaSlug } from '../validacion/comunes.js';

function aResumen(fila) {
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    descripcionCorta: fila.descripcion_corta,
    icono: fila.icono,
    orden: fila.orden,
  };
}

// GET /api/sedes/:sede/servicios: sin contenido (está en el detalle).
export async function listarServicios(sedeId) {
  return (await modelo.listarVisibles(sedeId)).map(aResumen);
}

// GET /api/sedes/:sede/servicios/:slug. El contenido JSONB se devuelve tal como se guarda.
// Un slug inexistente, de un servicio oculto o con formato imposible responde 404.
export async function obtenerServicio(sedeId, slug) {
  const fila = esquemaSlug.safeParse(slug).success
    ? await modelo.obtenerVisiblePorSlug(sedeId, slug)
    : null;

  if (!fila) {
    throw ErrorApp.noEncontrado(`No existe el servicio «${String(slug).slice(0, 120)}».`);
  }

  return {
    ...aResumen(fila),
    contenido: fila.contenido,
    preguntasFrecuentes: fila.preguntas_frecuentes,
  };
}
