// Avisos, noticias y notas de prensa vigentes (contrato: docs/api/publico.md).
import { ESTADOS_PUBLICACION, TIPOS_PUBLICACION } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import { obtenerRelacionados } from '../models/adminPublicaciones.model.js';
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
    abrirEnlaceDirecto: fila.abrir_enlace_directo,
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

  const relacionados = await obtenerRelacionados(fila.id, { soloVisibles: true });
  return {
    ...aResumen(fila),
    contenido: fila.contenido,
    serviciosRelacionados: relacionados.serviciosRelacionados,
    gruposRelacionados: relacionados.gruposRelacionados,
  };
}

const TIPOS_NOTICIAS = () => [
  TIPOS_PUBLICACION.nombreDe('NOTICIA'),
  TIPOS_PUBLICACION.nombreDe('NOTA_DE_PRENSA'),
];

async function listarNoticiasRelacionadas(opciones, consulta = {}) {
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const resultado = await modelo.listarVigentesPorRelacion({
    ...opciones,
    estadoPublicado: ESTADOS_PUBLICACION.nombreDe('PUBLICADO'),
    tipos: TIPOS_NOTICIAS(),
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });

  if (!resultado) {
    throw ErrorApp.noEncontrado(opciones.mensajeNoEncontrado);
  }

  return {
    datos: resultado.filas.map(aResumen),
    paginacion: armarPaginacion({ total: resultado.total, pagina, porPagina }),
  };
}

export function listarNoticiasPorServicio(sedeId, servicioSlug, consulta = {}) {
  return listarNoticiasRelacionadas(
    {
      tablaRelacion: 'publicacion_servicio',
      columnaRelacion: 'servicio_id',
      tablaDestino: 'servicio',
      sedeId,
      slugDestino: servicioSlug,
      mensajeNoEncontrado: `No existe el servicio «${String(servicioSlug).slice(0, 120)}».`,
    },
    consulta,
  );
}

export function listarNoticiasPorGrupo(sedeId, grupoSlug, consulta = {}) {
  return listarNoticiasRelacionadas(
    {
      tablaRelacion: 'publicacion_grupo_pastoral',
      columnaRelacion: 'grupo_pastoral_id',
      tablaDestino: 'grupo_pastoral',
      sedeId,
      slugDestino: grupoSlug,
      mensajeNoEncontrado: `No existe el grupo pastoral «${String(grupoSlug).slice(0, 120)}».`,
    },
    consulta,
  );
}
