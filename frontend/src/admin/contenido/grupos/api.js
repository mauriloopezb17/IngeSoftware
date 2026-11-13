// Llamadas de grupos pastorales (docs/api/admin.md §7).
import { clienteHttp } from '../../../services/clienteHttp.js';

export const CLAVE_GRUPOS = ['admin', 'grupos-pastorales'];

export async function listarGrupos(parametros = {}) {
  const { datos } = await clienteHttp.get('/admin/grupos-pastorales', { parametros });
  return datos;
}

export async function crearGrupo(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/grupos-pastorales', cuerpo);
  return datos;
}

export async function actualizarGrupo(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/grupos-pastorales/${id}`, cuerpo);
  return datos;
}

export function eliminarGrupo(id) {
  return clienteHttp.delete(`/admin/grupos-pastorales/${id}`);
}

export async function reordenarGrupos(ids) {
  const { datos } = await clienteHttp.post('/admin/grupos-pastorales/reordenar', { ids });
  return datos;
}

