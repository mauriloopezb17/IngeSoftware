// Servicios y sacramentos (contrato: docs/api/publico.md).
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/servicios.model.js';
import { imagen, urlPublica, variantesDe } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { slug as esquemaSlug } from '../validacion/comunes.js';

function resolverBloques(bloques = []) {
  return bloques.map((bloque) => {
    const actualizado =
      (bloque.type === 'image' || bloque.type === 'video') && bloque.props?.url
        ? {
            ...bloque,
            props: {
              ...bloque.props,
              url: urlPublica(bloque.props.url) ?? bloque.props.url,
            },
          }
        : bloque;
    if (!actualizado.children?.length) return actualizado;
    return { ...actualizado, children: resolverBloques(actualizado.children) };
  });
}

function resolverDetalle(detalle) {
  if (!detalle) return null;
  if (!detalle.contenido?.bloques) return detalle;
  return {
    ...detalle,
    contenido: {
      ...detalle.contenido,
      bloques: resolverBloques(detalle.contenido.bloques),
    },
  };
}

function aElementoGaleria(archivo) {
  return {
    id: archivo.id,
    url: urlPublica(archivo.url),
    textoAlternativo: archivo.texto_alternativo ?? null,
    ancho: archivo.ancho_px ?? null,
    alto: archivo.alto_px ?? null,
    variantes: variantesDe(archivo.url, archivo.ancho_px),
    tipoMime: archivo.tipo_mime,
  };
}

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
export async function listarServicios(sedeId, consulta = {}) {
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const { filas, total } = await modelo.listarVisibles(sedeId, {
    buscar: consulta.buscar,
    orden: consulta.orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });
  return {
    datos: filas.map(aResumen),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
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

  const idsGaleria = fila.detalle?.galeria ?? [];
  const archivos = await modelo.archivosPorIds(sedeId, idsGaleria);
  const porId = new Map(archivos.map((archivo) => [archivo.id, archivo]));
  const galeria = idsGaleria
    .map((archivoId) => porId.get(archivoId))
    .filter(Boolean)
    .map(aElementoGaleria);

  return {
    ...aResumen(fila),
    imagen: fila.imagen_id
      ? imagen({
          id: fila.imagen_id,
          url: fila.imagen_url,
          textoAlternativo: fila.imagen_texto_alternativo,
          ancho: fila.imagen_ancho,
          alto: fila.imagen_alto,
        })
      : null,
    contenido: fila.contenido,
    galeria,
    detalle: resolverDetalle(fila.detalle),
    preguntasFrecuentes: fila.preguntas_frecuentes,
  };
}
