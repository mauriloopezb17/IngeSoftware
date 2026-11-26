// Llamadas de sedes y redes sociales (docs/api/admin.md §9).
import { clienteHttp } from '../../../services/clienteHttp.js';

export const CLAVE_SEDES = ['admin', 'sedes'];

export async function listarSedes(parametros = {}) {
  const { datos } = await clienteHttp.get('/admin/sedes', {
    parametros: { porPagina: 100, ...parametros },
  });
  return datos;
}

export function listarSedesPaginadas(parametros = {}, senal) {
  return clienteHttp.get('/admin/sedes', { parametros, senal });
}

export async function crearSede(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/sedes', cuerpo);
  return datos;
}

export async function actualizarSede(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/sedes/${id}`, cuerpo);
  return datos;
}

