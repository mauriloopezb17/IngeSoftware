// Videos de YouTube (contrato: docs/api/publico.md, RF-05).
import * as modelo from '../models/videos.model.js';
import { formatearFecha } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';

// Las URL se arman a partir del id del video: no se guardan en la base.
export function urlsYoutube(youtubeVideoId) {
  const id = encodeURIComponent(youtubeVideoId);
  return {
    urlVideo: `https://www.youtube.com/watch?v=${id}`,
    urlInsercion: `https://www.youtube-nocookie.com/embed/${id}`,
    urlMiniatura: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function aVideo(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    youtubeVideoId: fila.youtube_video_id,
    ...urlsYoutube(fila.youtube_video_id),
    duracionSegundos: fila.duracion_segundos,
    destacado: fila.destacado,
    orden: fila.orden,
    fechaPublicacion: formatearFecha(fila.fecha_publicacion),
  };
}

// GET /api/sedes/:sede/videos
export async function listarVideos(sedeId, consulta = {}) {
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const { filas, total } = await modelo.listar(sedeId, {
    destacado: consulta.destacado,
    buscar: consulta.buscar,
    orden: consulta.orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });
  return {
    datos: filas.map(aVideo),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}
