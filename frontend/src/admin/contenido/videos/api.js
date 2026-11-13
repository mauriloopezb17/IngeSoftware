// Llamadas de videos de YouTube (docs/api/admin.md §8).
import { clienteHttp } from '../../../services/clienteHttp.js';

export const CLAVE_VIDEOS = ['admin', 'videos'];

export async function listarVideos(parametros = {}) {
  const { datos } = await clienteHttp.get('/admin/videos', { parametros });
  return datos;
}

export async function crearVideo(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/videos', cuerpo);
  return datos;
}

export async function actualizarVideo(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/videos/${id}`, cuerpo);
  return datos;
}

export function eliminarVideo(id) {
  return clienteHttp.delete(`/admin/videos/${id}`);
}

export async function reordenarVideos(ids) {
  const { datos } = await clienteHttp.post('/admin/videos/reordenar', { ids });
  return datos;
}

export function formatearDuracion(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  const min = Math.floor(segundos / 60);
  const seg = String(segundos % 60).padStart(2, '0');
  return `${min}:${seg}`;
}

