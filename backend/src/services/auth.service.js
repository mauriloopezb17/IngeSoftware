// Lógica de sesión del panel (docs/api/autenticacion.md).
import { ROLES } from '../constantes/catalogos.js';
import { permisosDe } from '../constantes/permisos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as usuarios from '../models/usuarios.model.js';
import { verificarContrasena, verificarContrasenaFicticia } from '../utils/contrasenas.js';
import { formatearFechaHora } from '../utils/formato.js';
import { firmarToken } from '../utils/sesion.js';

// El mismo mensaje para correo inexistente, contraseña incorrecta o usuario inactivo:
// no debe revelar qué correos están registrados.
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';

// Objeto de usuario que devuelven el login y /auth/yo. "sede" es null si el usuario no tiene
// (solo el Administrador puede no tener sede).
export function aUsuarioSesion(fila, sesionExpiraEn) {
  const rol = ROLES.aEnumeracion(fila.rol_nombre);

  return {
    id: fila.id,
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    rol,
    sede:
      fila.sede_id === null
        ? null
        : { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    permisos: [...permisosDe(rol.codigo)],
    fechaUltimoAcceso: formatearFechaHora(fila.fecha_ultimo_acceso),
    sesionExpiraEn: formatearFechaHora(sesionExpiraEn),
  };
}

// Abre una sesión. Devuelve { token, duracionSegundos, usuario } o lanza 401 NO_AUTENTICADO.
export async function iniciarSesion({ correo, contrasena }) {
  const usuario = await usuarios.buscarPorCorreo(correo);

  // Con un correo inexistente se verifica igual contra un hash ficticio: así la respuesta tarda lo
  // mismo y no revela qué correos existen. Un usuario inactivo también pasa por la verificación.
  const contrasenaCorrecta = usuario
    ? await verificarContrasena(contrasena, usuario.hash_contrasena)
    : await verificarContrasenaFicticia(contrasena);

  if (!usuario || !contrasenaCorrecta || !usuario.activo) {
    throw ErrorApp.noAutenticado(MENSAJE_CREDENCIALES);
  }

  const fechaUltimoAcceso = await usuarios.registrarAcceso(usuario.id);
  const { token, duracionSegundos, expiraEn } = firmarToken({
    id: usuario.id,
    rol: ROLES.codigoDe(usuario.rol_nombre),
    sede: usuario.sede_id,
  });

  return {
    token,
    duracionSegundos,
    usuario: aUsuarioSesion({ ...usuario, fecha_ultimo_acceso: fechaUltimoAcceso }, expiraEn),
  };
}
