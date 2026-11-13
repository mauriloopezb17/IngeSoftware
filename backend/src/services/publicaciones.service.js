// Avisos, noticias y notas de prensa vigentes (contrato: docs/api/publico.md).
import { ESTADOS_PUBLICACION, TIPOS_PUBLICACION } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/publicaciones.model.js';
import { patronBusqueda } from '../utils/busqueda.js';
import { formatearFechaHora, imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { slug as esquemaSlug } from '../validacion/comunes.js';

function aResumen(fila) {
  return {
    id: fila.id,
    tipo: TIPOS_PUBLICACION.aEnumeracion(fila.tipo_nombre),
    titulo: fila.titulo,
    slug: fila.slug,
    resumen: fila.resumen,
    categoria: fila.categoria,
    imagenPortada: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
    urlExterna: fila.url_externa,
    destacada: fila.destacada,
    fechaPublicacion: formatearFechaHora(fila.fecha_publicacion),
    fechaExpiracion: formatearFechaHora(fila.fecha_expiracion),
  };
}

// GET /api/sedes/:sede/publicaciones
// consulta: { tipo?: códigos, categoria?, destacada?, buscar?, orden, pagina, porPagina }
export async function listarPublicaciones(sedeId, consulta) {
  const { pagina, porPagina } = consulta;

  const { filas, total } = await modelo.listarVigentes(
    {
      sedeId,
      estadoPublicado: ESTADOS_PUBLICACION.nombreDe('PUBLICADO'),
      tipos: consulta.tipo?.map((codigo) => TIPOS_PUBLICACION.nombreDe(codigo)),
      categoria: consulta.categoria,
      destacada: consulta.destacada,
      patron: consulta.buscar ? patronBusqueda(consulta.buscar) : undefined,
    },
    {
      limite: porPagina,
      desplazamiento: desplazamiento(pagina, porPagina),
      ascendente: consulta.orden === 'fechaPublicacion',
    },
  );

  return {
    datos: filas.map(aResumen),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

// GET /api/sedes/:sede/publicaciones/:slug. Un borrador, una publicación programada o una
// expirada responden igual que una inexistente (404): el portal no revela lo que no está vigente.
export async function obtenerPublicacion(sedeId, slug) {
  const fila = esquemaSlug.safeParse(slug).success
    ? await modelo.obtenerVigentePorSlug({
        sedeId,
        estadoPublicado: ESTADOS_PUBLICACION.nombreDe('PUBLICADO'),
        slug,
      })
    : null;

  if (!fila) {
    throw ErrorApp.noEncontrado(`No existe la publicación «${String(slug).slice(0, 120)}».`);
  }

  return { ...aResumen(fila), contenido: fila.contenido };
}
