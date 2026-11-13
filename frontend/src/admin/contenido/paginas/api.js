// Llamadas a la API de páginas y bloques (docs/api/admin.md §12).
import { clienteHttp } from '../../../services/clienteHttp.js';
import { listarMultimedia } from '../../multimedia/api.js';

export const CLAVE_PAGINAS = ['admin', 'paginas'];

export const ESTADOS_PAGINA = [
  { codigo: 'BORRADOR', nombre: 'Borrador' },
  { codigo: 'PUBLICADO', nombre: 'Publicado' },
  { codigo: 'ARCHIVADO', nombre: 'Archivado' },
];

export const NOMBRES_TIPO_BLOQUE = {
  hero_video: 'Portada con video',
  texto_imagen: 'Texto con imagen',
  tarjetas: 'Grilla de tarjetas',
  cita: 'Cita destacada',
  galeria: 'Galería de fotos',
  video_youtube: 'Video de YouTube',
};

const REGEX_YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export async function listarPaginas(parametros = {}) {
  const { datos } = await clienteHttp.get('/admin/paginas', { parametros });
  return datos;
}

export async function obtenerPagina(id) {
  const { datos } = await clienteHttp.get(`/admin/paginas/${id}`);
  return datos;
}

export async function crearPagina(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/paginas', cuerpo);
  return datos;
}

export async function actualizarPagina(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/paginas/${id}`, cuerpo);
  return datos;
}

export function eliminarPagina(id) {
  return clienteHttp.delete(`/admin/paginas/${id}`);
}

export async function agregarBloque(paginaId, cuerpo) {
  const { datos } = await clienteHttp.post(`/admin/paginas/${paginaId}/bloques`, cuerpo);
  return datos;
}

export async function actualizarBloque(paginaId, bloqueId, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/paginas/${paginaId}/bloques/${bloqueId}`, cuerpo);
  return datos;
}

export function eliminarBloque(paginaId, bloqueId) {
  return clienteHttp.delete(`/admin/paginas/${paginaId}/bloques/${bloqueId}`);
}

export async function reordenarBloques(paginaId, ids) {
  const { datos } = await clienteHttp.post(`/admin/paginas/${paginaId}/bloques/reordenar`, { ids });
  return datos;
}

export async function listarVideosBiblioteca() {
  const { datos } = await listarMultimedia({ clase: 'VIDEO', porPagina: 50, orden: '-fechaSubida' });
  return datos ?? [];
}

export function aSlugTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extraerYoutubeId(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (REGEX_YOUTUBE_ID.test(limpio)) return limpio;

  let url;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  let candidato = null;
  if (host === 'youtu.be') {
    candidato = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      candidato = url.searchParams.get('v');
    } else if (
      url.pathname.startsWith('/shorts/') ||
      url.pathname.startsWith('/embed/') ||
      url.pathname.startsWith('/live/')
    ) {
      candidato = url.pathname.split('/')[2];
    }
  }
  return candidato && REGEX_YOUTUBE_ID.test(candidato) ? candidato : null;
}

export function resumenBloque(bloque) {
  const c = bloque?.contenido ?? {};
  switch (bloque?.tipo) {
    case 'hero_video':
      return c.titulo || c.url_video || 'Portada con video';
    case 'texto_imagen':
      return c.titulo || c.texto?.slice(0, 80) || 'Texto con imagen';
    case 'tarjetas': {
      const cantidad = Array.isArray(c.items) ? c.items.length : 0;
      const base = `${cantidad} ${cantidad === 1 ? 'tarjeta' : 'tarjetas'}`;
      return c.titulo ? `${c.titulo} · ${base}` : base;
    }
    case 'cita':
      return c.autor ? `«${c.texto}» — ${c.autor}` : `«${c.texto ?? ''}»`;
    case 'galeria': {
      const cantidad = Array.isArray(c.imagenes) ? c.imagenes.length : 0;
      const base = `${cantidad} ${cantidad === 1 ? 'imagen' : 'imágenes'}`;
      return c.titulo ? `${c.titulo} · ${base}` : base;
    }
    case 'video_youtube':
      return c.titulo ? `${c.titulo} (${c.youtube_video_id})` : `YouTube: ${c.youtube_video_id ?? ''}`;
    default:
      return bloque?.tipo ?? 'Bloque';
  }
}

