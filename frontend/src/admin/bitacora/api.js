// Llamadas a la API de bitácora (docs/api/admin.md §13).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_BITACORA = ['admin', 'bitacora'];

export const ACCIONES_BITACORA = [
  { codigo: 'INSERT', nombre: 'Alta (INSERT)' },
  { codigo: 'UPDATE', nombre: 'Modificación (UPDATE)' },
  { codigo: 'DELETE', nombre: 'Eliminación (DELETE)' },
];

export const ENTIDADES_BITACORA = [
  { codigo: 'publicacion', nombre: 'Publicación' },
  { codigo: 'evento', nombre: 'Evento' },
  { codigo: 'horario', nombre: 'Horario' },
  { codigo: 'servicio', nombre: 'Servicio' },
  { codigo: 'grupo_pastoral', nombre: 'Grupo pastoral' },
  { codigo: 'pagina', nombre: 'Página' },
  { codigo: 'bloque', nombre: 'Bloque' },
  { codigo: 'sede', nombre: 'Sede' },
  { codigo: 'usuario', nombre: 'Usuario' },
  { codigo: 'archivo_multimedia', nombre: 'Archivo multimedia' },
];

export function listarBitacora(parametros = {}) {
  return clienteHttp.get('/admin/bitacora', { parametros });
}

export function etiquetaAccion(accion) {
  switch (accion) {
    case 'INSERT':
      return 'Alta';
    case 'UPDATE':
      return 'Modificación';
    case 'DELETE':
      return 'Eliminación';
    default:
      return accion;
  }
}

export function formatearFechaHoraBitacora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatearValorBitacora(valor) {
  if (valor === undefined || valor === null) return '—';
  if (valor === '[oculto]') return '[oculto]';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
  return String(valor);
}

export function nombreCampoLegible(campo) {
  return String(campo).replace(/_/g, ' ');
}

