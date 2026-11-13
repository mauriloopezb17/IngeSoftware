// Llamadas del calendario parroquial (docs/api/admin.md §4).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_EVENTOS = ['admin', 'eventos'];
export const POR_PAGINA = 10;

// Los eventos no usan EN_REVISION (estados-publicacion.md §8).
export const ESTADOS_EVENTO = {
  PUBLICADO: 'Publicado',
  BORRADOR: 'Borrador',
  ARCHIVADO: 'Archivado',
};

// Filtro de RF-09: los próximos primero (orden cronológico) y los finalizados del más reciente al más antiguo.
export const VISTAS = {
  proximos: { etiqueta: 'Próximos', finalizados: 'false', orden: 'fechaInicio' },
  finalizados: { etiqueta: 'Finalizados', finalizados: 'true', orden: '-fechaInicio' },
  todos: { etiqueta: 'Todos', finalizados: '', orden: '-fechaInicio' },
};

export function listarEventos({ vista = 'proximos', categoria, estado, pagina, porPagina = POR_PAGINA }, senal) {
  const { finalizados, orden } = VISTAS[vista] ?? VISTAS.proximos;
  return clienteHttp.get('/admin/eventos', {
    parametros: { finalizados, orden, categoria, estado, pagina, porPagina },
    senal,
  });
}

export async function obtenerEvento(id, senal) {
  const { datos } = await clienteHttp.get(`/admin/eventos/${id}`, { senal });
  return datos;
}

export async function crearEvento(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/eventos', cuerpo);
  return datos;
}

export async function actualizarEvento(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/eventos/${id}`, cuerpo);
  return datos;
}

export const eliminarEvento = (id) => clienteHttp.delete(`/admin/eventos/${id}`);
