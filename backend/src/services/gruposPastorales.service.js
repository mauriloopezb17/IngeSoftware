// Grupos pastorales (contrato: docs/api/publico.md).
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/gruposPastorales.model.js';
import { imagen, urlPublica, variantesDe } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { tieneContenido } from '../validacion/blocknote.js';
import { slug as esquemaSlug } from '../validacion/comunes.js';

function tieneDetalle(fila) {
  if (fila.imagen_id) return true;
  if (fila.descripcion || fila.responsable || fila.whatsapp || fila.correo) return true;
  const detalle = fila.detalle;
  if (!detalle) return false;
  return (
    tieneContenido(detalle.contenido) ||
    (detalle.galeria?.length ?? 0) > 0 ||
    Boolean(detalle.videoYoutubeId)
  );
}

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

function aGrupo(fila) {
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    horarioReunion: fila.horario_reunion,
    responsable: fila.responsable,
    whatsapp: fila.whatsapp,
    correo: fila.correo,
    icono: fila.icono,
    imagen: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
    tieneDetalle: tieneDetalle(fila),
    orden: fila.orden,
  };
}

// GET /api/sedes/:sede/grupos-pastorales
export async function listarGruposPastorales(sedeId, consulta = {}) {
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const { filas, total } = await modelo.listarVisibles(sedeId, {
    buscar: consulta.buscar,
    orden: consulta.orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });
  return {
    datos: filas.map(aGrupo),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

// GET /api/sedes/:sede/grupos-pastorales/:slug
// Un slug con formato imposible (por ejemplo, con un byte nulo) responde 404 sin consultar la base.
export async function obtenerGrupoPastoral(sedeId, slug) {
  const fila = esquemaSlug.safeParse(slug).success
    ? await modelo.buscarPorSlugVisible(sedeId, slug)
    : null;
  if (!fila) {
    throw ErrorApp.noEncontrado(`No existe el grupo pastoral «${String(slug).slice(0, 120)}».`);
  }

  const idsGaleria = fila.detalle?.galeria ?? [];
  const archivos = await modelo.archivosPorIds(sedeId, idsGaleria);
  const porId = new Map(archivos.map((archivo) => [archivo.id, archivo]));
  const galeria = idsGaleria
    .map((archivoId) => porId.get(archivoId))
    .filter(Boolean)
    .map(aElementoGaleria);

  return {
    ...aGrupo(fila),
    galeria,
    detalle: resolverDetalle(fila.detalle),
  };
}
