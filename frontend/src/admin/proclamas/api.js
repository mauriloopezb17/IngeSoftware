// Llamadas de las proclamas matrimoniales (docs/api/admin.md §10, RF-02).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_PROCLAMAS = ['admin', 'proclamas'];
export const POR_PAGINA = 10;
export const MAX_PUBLICACIONES = 3;

// Vigentes: con una publicación ya alcanzada y matrimonio futuro. Historial: el resto (celebradas o aún sin publicar).
export const VISTAS = {
  vigentes: { etiqueta: 'Vigentes', vigentes: 'true', orden: 'fechaMatrimonio' },
  historial: { etiqueta: 'Historial', vigentes: 'false', orden: '-fechaMatrimonio' },
  todas: { etiqueta: 'Todas', vigentes: '', orden: '-fechaMatrimonio' },
};

export function listarProclamas({ vista = 'vigentes', buscar, anio, pagina, porPagina = POR_PAGINA }, senal) {
  const { vigentes, orden } = VISTAS[vista] ?? VISTAS.vigentes;
  return clienteHttp.get('/admin/proclamas', { parametros: { vigentes, orden, buscar, anio, pagina, porPagina }, senal });
}

export async function obtenerProclama(id, senal) {
  const { datos } = await clienteHttp.get(`/admin/proclamas/${id}`, { senal });
  return datos;
}

export async function crearProclama(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/proclamas', cuerpo);
  return datos;
}

export async function actualizarProclama(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/proclamas/${id}`, cuerpo);
  return datos;
}

export const eliminarProclama = (id) => clienteHttp.delete(`/admin/proclamas/${id}`);

// Las acciones sobre publicaciones devuelven la proclama completa (con su historial actualizado).
export async function agregarPublicacion(id, fecha) {
  const { datos } = await clienteHttp.post(`/admin/proclamas/${id}/publicaciones`, { fecha });
  return datos;
}

export async function cambiarFechaPublicacion(id, numero, fecha) {
  const { datos } = await clienteHttp.patch(`/admin/proclamas/${id}/publicaciones/${numero}`, { fecha });
  return datos;
}

// Solo la última. Responde 200 con la proclama actualizada (no 204: la proclama sigue existiendo).
export async function quitarPublicacion(id, numero) {
  const { datos } = await clienteHttp.delete(`/admin/proclamas/${id}/publicaciones/${numero}`);
  return datos;
}
