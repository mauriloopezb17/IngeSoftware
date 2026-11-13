// Llamadas a la API de usuarios del panel (docs/api/admin.md §14).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_USUARIOS = ['admin', 'usuarios'];

export const ROLES_USUARIO = [
  { codigo: 'ADMINISTRADOR', nombre: 'Administrador' },
  { codigo: 'PARROCO', nombre: 'Párroco' },
  { codigo: 'SECRETARIA', nombre: 'Secretaría' },
  { codigo: 'MARKETING', nombre: 'Marketing' },
];

export async function listarUsuarios(parametros = {}) {
  return clienteHttp.get('/admin/usuarios', { parametros });
}

export async function crearUsuario(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/usuarios', cuerpo);
  return datos;
}

export async function actualizarUsuario(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/usuarios/${id}`, cuerpo);
  return datos;
}

export function restablecerContrasena(id, contrasenaNueva) {
  return clienteHttp.post(`/admin/usuarios/${id}/restablecer-contrasena`, {
    contrasenaNueva,
  });
}

export function formatearFechaUsuario(iso) {
  if (!iso) return 'Sin accesos';
  return new Date(iso).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

