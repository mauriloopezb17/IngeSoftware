// Llamadas de las publicaciones del panel (docs/api/admin.md §3).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_PUBLICACIONES = ['admin', 'publicaciones'];
export const POR_PAGINA = 8;

// Los avisos son de otra pantalla: esta lista solo trae noticias y notas de prensa.
export const TIPOS_DE_ESTA_PANTALLA = {
  NOTICIA: 'Noticia',
  NOTA_DE_PRENSA: 'Nota de prensa',
};

export const ESTADOS = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADO: 'Publicado',
  ARCHIVADO: 'Archivado',
};

export async function obtenerPublicacion(id, senal) {
  const { datos } = await clienteHttp.get(`/admin/publicaciones/${id}`, { senal });
  return datos;
}

export async function crearPublicacion(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/publicaciones', cuerpo);
  return datos;
}

export async function actualizarPublicacion(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/publicaciones/${id}`, cuerpo);
  return datos;
}

// Marketing envía su borrador al Párroco: BORRADOR -> EN_REVISION (admin.md §3, acciones de estado).
export async function enviarARevision(id) {
  const { datos } = await clienteHttp.post(`/admin/publicaciones/${id}/enviar-revision`);
  return datos;
}

// Mismos catálogos que usa el resto del panel (GET /admin/catalogos): comparten la caché.
export const CLAVE_CATALOGOS = ['admin', 'catalogos'];

export async function obtenerCatalogos() {
  const { datos } = await clienteHttp.get('/admin/catalogos');
  return datos;
}

export function listarPublicaciones({ estado, tipo, buscar, autor, pagina, porPagina = POR_PAGINA }, senal) {
  return clienteHttp.get('/admin/publicaciones', {
    parametros: {
      estado,
      tipo: tipo || Object.keys(TIPOS_DE_ESTA_PANTALLA).join(','),
      buscar,
      autor,
      pagina,
      porPagina,
    },
    senal,
  });
}
