// Llamadas de la sección de horarios (docs/api/admin.md §5).
import { clienteHttp } from '../../../services/clienteHttp.js';

export const CLAVE_HORARIOS = ['admin', 'horarios'];
export const CLAVE_CATALOGOS = ['admin', 'catalogos'];

export const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
];

export function nombreDia(dia) {
  return DIAS_SEMANA.find((d) => d.valor === dia)?.nombre ?? `Día ${dia}`;
}

export async function obtenerCatalogos() {
  const { datos } = await clienteHttp.get('/admin/catalogos');
  return datos;
}

export async function listarHorarios(parametros = {}) {
  const { datos } = await clienteHttp.get('/admin/horarios', { parametros });
  return datos;
}

export async function crearHorario(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/horarios', cuerpo);
  return datos;
}

export async function actualizarHorario(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/horarios/${id}`, cuerpo);
  return datos;
}

export function eliminarHorario(id) {
  return clienteHttp.delete(`/admin/horarios/${id}`);
}

