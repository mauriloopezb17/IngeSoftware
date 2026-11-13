// Llamadas de servicios y preguntas frecuentes (docs/api/admin.md §6).
import { clienteHttp } from '../../../services/clienteHttp.js';

export const CLAVE_SERVICIOS = ['admin', 'servicios'];

export async function listarServicios(parametros = {}) {
  const { datos } = await clienteHttp.get('/admin/servicios', { parametros });
  return datos;
}

export async function obtenerServicio(id) {
  const { datos } = await clienteHttp.get(`/admin/servicios/${id}`);
  return datos;
}

export async function crearServicio(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/servicios', cuerpo);
  return datos;
}

export async function actualizarServicio(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/servicios/${id}`, cuerpo);
  return datos;
}

export function eliminarServicio(id) {
  return clienteHttp.delete(`/admin/servicios/${id}`);
}

export async function reordenarServicios(ids) {
  const { datos } = await clienteHttp.post('/admin/servicios/reordenar', { ids });
  return datos;
}

export async function crearPreguntaFrecuente(servicioId, cuerpo) {
  const { datos } = await clienteHttp.post(
    `/admin/servicios/${servicioId}/preguntas-frecuentes`,
    cuerpo,
  );
  return datos;
}

export async function actualizarPreguntaFrecuente(servicioId, preguntaId, cuerpo) {
  const { datos } = await clienteHttp.patch(
    `/admin/servicios/${servicioId}/preguntas-frecuentes/${preguntaId}`,
    cuerpo,
  );
  return datos;
}

export function eliminarPreguntaFrecuente(servicioId, preguntaId) {
  return clienteHttp.delete(
    `/admin/servicios/${servicioId}/preguntas-frecuentes/${preguntaId}`,
  );
}

export async function reordenarPreguntasFrecuentes(servicioId, ids) {
  const { datos } = await clienteHttp.post(
    `/admin/servicios/${servicioId}/preguntas-frecuentes/reordenar`,
    { ids },
  );
  return datos;
}

