// Videos de YouTube (contrato: docs/api/publico.md, RF-05).
import * as modelo from '../models/videos.model.js';
import { formatearFecha } from '../utils/formato.js';

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
export async function listarVideos(sedeId) {
  return (await modelo.listar(sedeId)).map(aVideo);
}
